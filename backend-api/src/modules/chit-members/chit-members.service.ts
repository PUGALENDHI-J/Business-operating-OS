import { PoolClient } from 'pg';
import { query, withTransaction } from '@/db/pool';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const SELECT = `
  cm.id, cm.member_serial_no, cm.status, cm.join_date, cm.exit_date, cm.exit_reason,
  cm.customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
  cm.chit_group_id, cg.group_code, cs.name AS scheme_name,
  cm.created_at, cm.updated_at`;
const FROM = `
  FROM chit_members cm
  JOIN customers c ON c.id = cm.customer_id
  JOIN chit_groups cg ON cg.id = cm.chit_group_id
  JOIN chit_schemes cs ON cs.id = cg.scheme_id`;
const SORTABLE = ['member_serial_no', 'join_date', 'created_at'];

export async function listChitMembers(q: PaginationQuery & { chitGroupId?: string }) {
  const where = ['cm.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (q.chitGroupId) { params.push(q.chitGroupId); where.push(`cm.chit_group_id = $${params.length}`); }
  if (q.search) { params.push(`%${q.search}%`); where.push(`(c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = 'cm.' + safeSortColumn(q.sortBy, SORTABLE, 'created_at');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${q.sortDir.toUpperCase()} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, parseInt(countResult.rows[0].count, 10)) };
}

export async function getChitMemberById(id: string) {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE cm.id = $1 AND cm.deleted_at IS NULL`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Chit member');
  return result.rows[0];
}

function addPeriod(date: Date, frequency: 'weekly' | 'monthly', n: number): Date {
  const d = new Date(date);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7 * n);
  else d.setMonth(d.getMonth() + n);
  return d;
}

interface CreateInput {
  chit_group_id: string;
  customer_id: string;
  member_serial_no: number;
  join_date?: string;
}

/**
 * Adds a customer to a chit group AND generates that member's full
 * installment schedule (one row per cycle, per the scheme's duration and
 * frequency) in the same transaction — a member without a schedule would
 * be an inconsistent state the rest of the system (payments, dashboards)
 * can't reason about.
 */
export async function createChitMember(input: CreateInput) {
  const memberId = await withTransaction(async (client: PoolClient) => {
    const groupResult = await client.query(
      `SELECT cg.id, cg.start_date, cs.duration_periods, cs.frequency, cs.installment_amount, cs.member_count
         FROM chit_groups cg JOIN chit_schemes cs ON cs.id = cg.scheme_id
        WHERE cg.id = $1 AND cg.deleted_at IS NULL`,
      [input.chit_group_id],
    );
    const group = groupResult.rows[0];
    if (!group) throw new NotFoundError('Chit group');

    const currentCountResult = await client.query<{ count: string }>(
      `SELECT count(*) FROM chit_members WHERE chit_group_id = $1 AND deleted_at IS NULL`,
      [input.chit_group_id],
    );
    if (parseInt(currentCountResult.rows[0].count, 10) >= group.member_count) {
      throw new ConflictError(`This chit group is already full (${group.member_count} members)`);
    }

    const memberResult = await client.query<{ id: string }>(
      `INSERT INTO chit_members (chit_group_id, customer_id, member_serial_no, join_date)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE)) RETURNING id`,
      [input.chit_group_id, input.customer_id, input.member_serial_no, input.join_date ?? null],
    );
    const memberId = memberResult.rows[0].id;

    const startDate = new Date(group.start_date);
    for (let cycle = 1; cycle <= group.duration_periods; cycle++) {
      const dueDate = addPeriod(startDate, group.frequency, cycle - 1);
      await client.query(
        `INSERT INTO installments (chit_member_id, cycle_number, due_date, due_amount) VALUES ($1, $2, $3, $4)`,
        [memberId, cycle, dueDate.toISOString().slice(0, 10), group.installment_amount],
      );
    }

    return memberId;
  });

  // Read AFTER commit: getChitMemberById uses the shared pool, which runs
  // on a different connection than `client` above. Under READ COMMITTED
  // isolation, that connection cannot see the transaction's writes until
  // withTransaction has actually committed — so this lookup must happen
  // out here, not inside the callback.
  return getChitMemberById(memberId);
}

export async function updateChitMember(id: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  if (columns.length === 0) return getChitMemberById(id);
  const values = Object.values(input);
  const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const result = await query(`UPDATE chit_members SET ${setSql} WHERE id = $${columns.length + 1} AND deleted_at IS NULL RETURNING id`, [...values, id]);
  if (!result.rows[0]) throw new NotFoundError('Chit member');
  return getChitMemberById(id);
}

export async function deleteChitMember(id: string): Promise<void> {
  const result = await query(`UPDATE chit_members SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Chit member');
}
