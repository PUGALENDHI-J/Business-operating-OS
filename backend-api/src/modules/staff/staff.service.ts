import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { query, withTransaction } from '@/db/pool';
import { config } from '@/config/env';
import { NotFoundError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const SORTABLE = ['full_name', 'employee_code', 'created_at'];

const STAFF_SELECT = `
  s.id, s.employee_code, s.designation, s.joining_date, s.is_active,
  s.branch_id, b.name AS branch_name,
  u.id AS user_id, u.full_name, u.phone, u.email,
  s.created_at, s.updated_at`;

export async function listStaff(q: PaginationQuery) {
  const whereClauses = ['s.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (q.search) {
    params.push(`%${q.search}%`);
    whereClauses.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR s.employee_code ILIKE $${params.length})`);
  }
  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const sortColumn = safeSortColumn(q.sortBy, SORTABLE, 'full_name').replace(/^(full_name|employee_code)$/, (m) =>
    m === 'full_name' ? 'u.full_name' : `s.${m}`,
  );
  const sortColumnFinal = sortColumn === 'created_at' ? 's.created_at' : sortColumn;

  const countResult = await query<{ count: string }>(
    `SELECT count(*) FROM staff s JOIN users u ON u.id = s.user_id JOIN branches b ON b.id = s.branch_id ${whereSql}`,
    params,
  );
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${STAFF_SELECT} FROM staff s
       JOIN users u ON u.id = s.user_id
       JOIN branches b ON b.id = s.branch_id
     ${whereSql}
     ORDER BY ${sortColumnFinal} ${q.sortDir.toUpperCase()}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, totalItems) };
}

export async function getStaffById(id: string) {
  const result = await query(
    `SELECT ${STAFF_SELECT} FROM staff s
       JOIN users u ON u.id = s.user_id
       JOIN branches b ON b.id = s.branch_id
     WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [id],
  );
  if (!result.rows[0]) throw new NotFoundError('Staff member');

  const roles = await query<{ id: string; name: string }>(
    `SELECT r.id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [result.rows[0].user_id],
  );
  return { ...result.rows[0], roles: roles.rows };
}

interface CreateStaffInput {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  branch_id: string;
  employee_code?: string;
  designation?: string;
  joining_date?: string;
  role_ids: string[];
}

export async function createStaff(input: CreateStaffInput) {
  const staffId = await withTransaction(async (client: PoolClient) => {
    const passwordHash = await bcrypt.hash(input.password, config.bcryptSaltRounds);
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (user_type, full_name, phone, email, password_hash)
       VALUES ('staff', $1, $2, $3, $4) RETURNING id`,
      [input.full_name, input.phone, input.email ?? null, passwordHash],
    );
    const userId = userResult.rows[0].id;

    const staffResult = await client.query<{ id: string }>(
      `INSERT INTO staff (user_id, branch_id, employee_code, designation, joining_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, input.branch_id, input.employee_code ?? null, input.designation ?? null, input.joining_date ?? null],
    );

    for (const roleId of input.role_ids) {
      await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
    }

    return staffResult.rows[0].id;
  });

  return getStaffById(staffId);
}

interface UpdateStaffInput {
  full_name?: string;
  email?: string;
  branch_id?: string;
  designation?: string;
  is_active?: boolean;
  role_ids?: string[];
}

export async function updateStaff(id: string, input: UpdateStaffInput) {
  await withTransaction(async (client: PoolClient) => {
    const staffRow = await client.query<{ user_id: string }>(`SELECT user_id FROM staff WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!staffRow.rows[0]) throw new NotFoundError('Staff member');
    const userId = staffRow.rows[0].user_id;

    if (input.full_name || input.email) {
      const setParts: string[] = [];
      const params: unknown[] = [];
      if (input.full_name) { params.push(input.full_name); setParts.push(`full_name = $${params.length}`); }
      if (input.email) { params.push(input.email); setParts.push(`email = $${params.length}`); }
      params.push(userId);
      await client.query(`UPDATE users SET ${setParts.join(', ')} WHERE id = $${params.length}`, params);
    }

    const staffSetParts: string[] = [];
    const staffParams: unknown[] = [];
    if (input.branch_id) { staffParams.push(input.branch_id); staffSetParts.push(`branch_id = $${staffParams.length}`); }
    if (input.designation !== undefined) { staffParams.push(input.designation); staffSetParts.push(`designation = $${staffParams.length}`); }
    if (input.is_active !== undefined) { staffParams.push(input.is_active); staffSetParts.push(`is_active = $${staffParams.length}`); }
    if (staffSetParts.length > 0) {
      staffParams.push(id);
      await client.query(`UPDATE staff SET ${staffSetParts.join(', ')} WHERE id = $${staffParams.length}`, staffParams);
    }

    if (input.role_ids) {
      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
      for (const roleId of input.role_ids) {
        await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
      }
    }
  });

  return getStaffById(id);
}

export async function deleteStaff(id: string): Promise<void> {
  const result = await query(`UPDATE staff SET deleted_at = now(), is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Staff member');
}
