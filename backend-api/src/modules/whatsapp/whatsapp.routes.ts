import { z } from 'zod';
import { Router } from 'express';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema, buildPaginationMeta } from '@/utils/pagination';
import { createCrudRouter } from '@/utils/crudFactory';

// ---------------------------------------------------------------------
// Templates: standard CRUD, since managing the registry of templates
// pending/approved with Meta is just data management.
// ---------------------------------------------------------------------
const createTemplateSchema = z.object({
  template_name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(50).optional(),
  language_code: z.string().trim().max(10).default('en'),
  body_text: z.string().trim().min(1),
});
const updateTemplateSchema = createTemplateSchema.partial().extend({
  meta_template_name: z.string().trim().max(100).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'disabled']).optional(),
});

const templatesRouter = createCrudRouter({
  permissionModule: 'whatsapp',
  table: 'whatsapp_templates',
  selectColumns: ['id', 'template_name', 'meta_template_name', 'category', 'language_code', 'body_text', 'status', 'created_at', 'updated_at'],
  searchableColumns: ['template_name'],
  sortableColumns: ['template_name', 'created_at'],
  defaultSort: 'template_name',
  softDelete: false,
  createSchema: createTemplateSchema,
  updateSchema: updateTemplateSchema,
});

// ---------------------------------------------------------------------
// Messages: READ-ONLY log. Per Phase 3 instructions, sending is NOT
// implemented — there is deliberately no POST /whatsapp/messages/send
// endpoint here. This only exposes the (currently always-empty, until
// Phase 8) message audit trail for the CRM's "WhatsApp History" views.
// ---------------------------------------------------------------------
const messagesRouter = Router();
messagesRouter.get('/', authenticate, authorize('whatsapp', 'read'), validate({ query: paginationQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, search } = req.query as unknown as { page: number; pageSize: number; search?: string };
  const where: string[] = [];
  const params: unknown[] = [];
  if (search) { params.push(`%${search}%`); where.push(`wm.recipient_phone ILIKE $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countResult = await query<{ count: string }>(`SELECT count(*) FROM whatsapp_messages wm ${whereSql}`, params);
  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const dataResult = await query(
    `SELECT wm.id, wm.recipient_phone, wm.recipient_customer_id, wm.status, wm.related_entity_type, wm.related_entity_id,
            wt.template_name, wm.sent_at, wm.delivered_at, wm.read_at, wm.error_message, wm.created_at
       FROM whatsapp_messages wm
       LEFT JOIN whatsapp_templates wt ON wt.id = wm.template_id
       ${whereSql}
      ORDER BY wm.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  res.status(200).json({ data: dataResult.rows, meta: buildPaginationMeta(page, pageSize, parseInt(countResult.rows[0].count, 10)) });
}));

const router = Router();
router.use('/templates', templatesRouter);
router.use('/messages', messagesRouter);

export default router;
