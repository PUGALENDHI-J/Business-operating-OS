import { Router } from 'express';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, safeSortColumn, buildPaginationMeta } from '@/utils/pagination';
import { NotFoundError } from '@/utils/errors';

const router = Router();
const SAFE_COLUMNS = 'id, user_type, full_name, email, phone, is_active, last_login_at, created_at';
const SORTABLE = ['full_name', 'created_at', 'last_login_at'];

router.get(
  '/',
  authenticate,
  authorize('users', 'read'),
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, search, sortBy, sortDir } = req.query as unknown as {
      page: number; pageSize: number; search?: string; sortBy?: string; sortDir: 'asc' | 'desc';
    };
    const where = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const sortColumn = safeSortColumn(sortBy, SORTABLE, 'full_name');

    const countResult = await query<{ count: string }>(`SELECT count(*) FROM users ${whereSql}`, params);
    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const dataResult = await query(
      `SELECT ${SAFE_COLUMNS} FROM users ${whereSql} ORDER BY ${sortColumn} ${sortDir.toUpperCase()}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );
    res.status(200).json({
      data: dataResult.rows,
      meta: buildPaginationMeta(page, pageSize, parseInt(countResult.rows[0].count, 10)),
    });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize('users', 'read'),
  asyncHandler(async (req, res) => {
    const result = await query(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL`, [(req.params.id as string)]);
    if (!result.rows[0]) throw new NotFoundError('User');
    res.status(200).json({ data: result.rows[0] });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize('users', 'delete'),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE users SET is_active = false, deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [(req.params.id as string)],
    );
    if (!result.rows[0]) throw new NotFoundError('User');
    res.status(204).send();
  }),
);

export default router;
