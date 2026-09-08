import { uuidSchema } from '@/utils/validators';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, safeSortColumn, buildPaginationMeta } from '@/utils/pagination';
import { query } from '@/db/pool';
import { NotFoundError } from '@/utils/errors';

const router = Router();

const createSchema = z.object({
  scheme_id: uuidSchema,
  branch_id: uuidSchema,
  group_code: z.string().trim().min(1).max(30),
  start_date: z.string().date(),
  end_date: z.string().date(),
});

const updateSchema = z.object({
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
  current_cycle: z.coerce.number().int().min(0).optional(),
  end_date: z.string().date().optional(),
});

const SELECT = `
  cg.id, cg.group_code, cg.start_date, cg.end_date, cg.status, cg.current_cycle,
  cg.scheme_id, cs.name AS scheme_name, cs.chit_amount, cs.member_count, cs.frequency,
  cg.branch_id, b.name AS branch_name,
  cg.created_at, cg.updated_at`;
const FROM = `FROM chit_groups cg JOIN chit_schemes cs ON cs.id = cg.scheme_id JOIN branches b ON b.id = cg.branch_id`;
const SORTABLE = ['group_code', 'start_date', 'created_at'];

router.get('/', authenticate, authorize('chit_groups', 'read'), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, search, sortBy, sortDir } = req.query as unknown as { page: number; pageSize: number; search?: string; sortBy?: string; sortDir: 'asc' | 'desc' };
  const where = ['cg.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (search) { params.push(`%${search}%`); where.push(`cg.group_code ILIKE $${params.length}`); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = 'cg.' + safeSortColumn(sortBy, SORTABLE, 'created_at');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${sortDir.toUpperCase()} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  res.status(200).json({ data: dataResult.rows, meta: buildPaginationMeta(page, pageSize, parseInt(countResult.rows[0].count, 10)) });
}));

router.get('/:id', authenticate, authorize('chit_groups', 'read'), asyncHandler(async (req, res) => {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE cg.id = $1 AND cg.deleted_at IS NULL`, [(req.params.id as string)]);
  if (!result.rows[0]) throw new NotFoundError('Chit group');
  res.status(200).json({ data: result.rows[0] });
}));

router.post('/', authenticate, authorize('chit_groups', 'write'), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const { scheme_id, branch_id, group_code, start_date, end_date } = req.body;
  const result = await query<{ id: string }>(
    `INSERT INTO chit_groups (scheme_id, branch_id, group_code, start_date, end_date) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [scheme_id, branch_id, group_code, start_date, end_date],
  );
  const created = await query(`SELECT ${SELECT} ${FROM} WHERE cg.id = $1`, [result.rows[0].id]);
  res.status(201).json({ data: created.rows[0] });
}));

router.patch('/:id', authenticate, authorize('chit_groups', 'write'), validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const columns = Object.keys(req.body);
  if (columns.length === 0) {
    const existing = await query(`SELECT ${SELECT} ${FROM} WHERE cg.id = $1 AND cg.deleted_at IS NULL`, [(req.params.id as string)]);
    if (!existing.rows[0]) throw new NotFoundError('Chit group');
    res.status(200).json({ data: existing.rows[0] });
    return;
  }
  const values = Object.values(req.body);
  const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const updateResult = await query(`UPDATE chit_groups SET ${setSql} WHERE id = $${columns.length + 1} AND deleted_at IS NULL RETURNING id`, [...values, (req.params.id as string)]);
  if (!updateResult.rows[0]) throw new NotFoundError('Chit group');
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE cg.id = $1`, [(req.params.id as string)]);
  res.status(200).json({ data: result.rows[0] });
}));

router.delete('/:id', authenticate, authorize('chit_groups', 'delete'), asyncHandler(async (req, res) => {
  const result = await query(`UPDATE chit_groups SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [(req.params.id as string)]);
  if (!result.rows[0]) throw new NotFoundError('Chit group');
  res.status(204).send();
}));

export default router;
