import { Router } from 'express';
import { z } from 'zod';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, buildPaginationMeta } from '@/utils/pagination';
import { NotFoundError } from '@/utils/errors';

const router = Router();
const listQuerySchema = paginationQuerySchema.extend({ isRead: z.coerce.boolean().optional() });

// Notifications are always scoped to the requesting user — there is no
// "list everyone's notifications" endpoint, so authorize() here checks
// read access to the notifications module in general, while the query
// itself always filters to req.user.id.
router.get('/', authenticate, authorize('notifications', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, isRead } = req.query as unknown as { page: number; pageSize: number; isRead?: boolean };
  const where = ['recipient_user_id = $1'];
  const params: unknown[] = [req.user!.id];
  if (isRead !== undefined) { params.push(isRead); where.push(`is_read = $${params.length}`); }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countResult = await query<{ count: string }>(`SELECT count(*) FROM notifications ${whereSql}`, params);
  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const dataResult = await query(
    `SELECT id, type, title, body, related_entity_type, related_entity_id, is_read, read_at, created_at
       FROM notifications ${whereSql} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  res.status(200).json({ data: dataResult.rows, meta: buildPaginationMeta(page, pageSize, parseInt(countResult.rows[0].count, 10)) });
}));

router.patch('/:id/read', authenticate, authorize('notifications', 'read'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE notifications SET is_read = true, read_at = now()
      WHERE id = $1 AND recipient_user_id = $2 RETURNING id`,
    [(req.params.id as string), req.user!.id],
  );
  if (!result.rows[0]) throw new NotFoundError('Notification');
  res.status(200).json({ data: { id: result.rows[0].id, isRead: true } });
}));

router.post('/mark-all-read', authenticate, authorize('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(`UPDATE notifications SET is_read = true, read_at = now() WHERE recipient_user_id = $1 AND is_read = false`, [req.user!.id]);
  res.status(200).json({ data: { message: 'All notifications marked as read.' } });
}));

export default router;
