import { uuidSchema } from '@/utils/validators';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, safeSortColumn, buildPaginationMeta } from '@/utils/pagination';
import { query } from '@/db/pool';
import { NotFoundError, ConflictError } from '@/utils/errors';

const router = Router();

const SELECT = `
  i.id, i.cycle_number, i.due_date, i.due_amount, i.paid_amount, i.status,
  i.chit_member_id, c.full_name AS customer_name, c.phone AS customer_phone,
  cg.group_code, cs.name AS scheme_name,
  i.created_at, i.updated_at`;
const FROM = `
  FROM installments i
  JOIN chit_members cm ON cm.id = i.chit_member_id
  JOIN customers c ON c.id = cm.customer_id
  JOIN chit_groups cg ON cg.id = cm.chit_group_id
  JOIN chit_schemes cs ON cs.id = cg.scheme_id`;
const SORTABLE = ['due_date', 'status', 'created_at'];

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'paid', 'partial', 'overdue', 'waived']).optional(),
  chitMemberId: uuidSchema.optional(),
});

const updateSchema = z.object({
  status: z.enum(['pending', 'paid', 'partial', 'overdue', 'waived']),
});

router.get('/', authenticate, authorize('installments', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, search, sortBy, sortDir, status, chitMemberId } = req.query as unknown as {
    page: number; pageSize: number; search?: string; sortBy?: string; sortDir: 'asc' | 'desc'; status?: string; chitMemberId?: string;
  };
  const where = ['1=1'];
  const params: unknown[] = [];
  if (status) { params.push(status); where.push(`i.status = $${params.length}`); }
  if (chitMemberId) { params.push(chitMemberId); where.push(`i.chit_member_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = 'i.' + safeSortColumn(sortBy, SORTABLE, 'due_date');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${sortDir.toUpperCase()} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  res.status(200).json({ data: dataResult.rows, meta: buildPaginationMeta(page, pageSize, parseInt(countResult.rows[0].count, 10)) });
}));

router.get('/:id', authenticate, authorize('installments', 'read'), asyncHandler(async (req, res) => {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE i.id = $1`, [(req.params.id as string)]);
  if (!result.rows[0]) throw new NotFoundError('Installment');
  res.status(200).json({ data: result.rows[0] });
}));

router.patch('/:id', authenticate, authorize('installments', 'write'), validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  // Only 'waived' is a legitimate manual transition here — 'paid'/'partial'
  // must come from the payments module so paid_amount stays consistent.
  if (req.body.status !== 'waived') {
    throw new ConflictError("Only the 'waived' status can be set directly. Record a payment via POST /payments to mark an installment paid.");
  }
  const result = await query(`UPDATE installments SET status = 'waived' WHERE id = $1 RETURNING id`, [(req.params.id as string)]);
  if (!result.rows[0]) throw new NotFoundError('Installment');
  const updated = await query(`SELECT ${SELECT} ${FROM} WHERE i.id = $1`, [(req.params.id as string)]);
  res.status(200).json({ data: updated.rows[0] });
}));

export default router;
