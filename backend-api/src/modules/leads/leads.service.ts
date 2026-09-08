import { PoolClient } from 'pg';
import { query, withTransaction } from '@/db/pool';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const SELECT = `
  l.id, l.full_name, l.phone, l.email, l.source, l.status, l.notes,
  l.interested_scheme_id, cs.name AS interested_scheme_name,
  l.branch_id, b.name AS branch_name,
  l.assigned_staff_id, su.full_name AS assigned_staff_name,
  l.converted_customer_id,
  l.created_at, l.updated_at`;

const SORTABLE = ['full_name', 'status', 'created_at'];

const FROM = `
  FROM leads l
  LEFT JOIN chit_schemes cs ON cs.id = l.interested_scheme_id
  LEFT JOIN branches b ON b.id = l.branch_id
  LEFT JOIN staff st ON st.id = l.assigned_staff_id
  LEFT JOIN users su ON su.id = st.user_id`;

export async function listLeads(q: PaginationQuery & { status?: string }) {
  const where = ['l.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (q.status) {
    params.push(q.status);
    where.push(`l.status = $${params.length}`);
  }
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(`(l.full_name ILIKE $${params.length} OR l.phone ILIKE $${params.length})`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = 'l.' + safeSortColumn(q.sortBy, SORTABLE, 'created_at');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${q.sortDir.toUpperCase()}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, parseInt(countResult.rows[0].count, 10)) };
}

export async function getLeadById(id: string) {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE l.id = $1 AND l.deleted_at IS NULL`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Lead');
  return result.rows[0];
}

export async function createLead(input: Record<string, unknown>) {
  const columns = Object.keys(input);
  const values = Object.values(input);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const result = await query<{ id: string }>(
    `INSERT INTO leads (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values,
  );
  return getLeadById(result.rows[0].id);
}

export async function updateLead(id: string, input: Record<string, unknown>) {
  if (input.status === 'converted') {
    throw new ConflictError('Use POST /leads/:id/convert to move a lead to converted — it creates the linked customer record.');
  }
  const columns = Object.keys(input);
  if (columns.length === 0) return getLeadById(id);
  const values = Object.values(input);
  const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const result = await query(
    `UPDATE leads SET ${setSql} WHERE id = $${columns.length + 1} AND deleted_at IS NULL RETURNING id`,
    [...values, id],
  );
  if (!result.rows[0]) throw new NotFoundError('Lead');
  return getLeadById(id);
}

export async function deleteLead(id: string): Promise<void> {
  const result = await query(`UPDATE leads SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Lead');
}

interface ConvertInput {
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  date_of_birth?: string;
}

/** Converts a lead into a customer record, atomically, and marks the lead converted. */
export async function convertLead(leadId: string, input: ConvertInput) {
  return withTransaction(async (client: PoolClient) => {
    const leadResult = await client.query(
      `SELECT * FROM leads WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [leadId],
    );
    const lead = leadResult.rows[0];
    if (!lead) throw new NotFoundError('Lead');
    if (lead.status === 'converted') throw new ConflictError('Lead has already been converted');

    const customerResult = await client.query<{ id: string }>(
      `INSERT INTO customers (full_name, phone, email, address_line1, city, state, pincode, date_of_birth, branch_id, assigned_staff_id, source_lead_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        lead.full_name, lead.phone, lead.email,
        input.address_line1 ?? null, input.city ?? null, input.state ?? null, input.pincode ?? null,
        input.date_of_birth ?? null, lead.branch_id, lead.assigned_staff_id, lead.id,
      ],
    );
    const customerId = customerResult.rows[0].id;

    await client.query(
      `UPDATE leads SET status = 'converted', converted_customer_id = $1 WHERE id = $2`,
      [customerId, leadId],
    );

    return { leadId, customerId };
  });
}
