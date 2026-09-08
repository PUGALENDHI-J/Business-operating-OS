import { Router } from 'express';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { recordPaymentSchema, reversePaymentSchema, listPaymentsQuerySchema } from './payments.schema';
import * as paymentsService from './payments.service';

const router = Router();
const listQuerySchema = paginationQuerySchema.merge(listPaymentsQuerySchema);

router.get('/', authenticate, authorize('payments', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.status(200).json(await paymentsService.listPayments(req.query as never));
}));

router.get('/:id', authenticate, authorize('payments', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await paymentsService.getPaymentById((req.params.id as string)) });
}));

router.post('/', authenticate, authorize('payments', 'write'), validate({ body: recordPaymentSchema }), asyncHandler(async (req, res) => {
  // Resolve the acting staff member from the authenticated session — the
  // client cannot claim to be a different collector.
  let collectedByStaffId: string | null = null;
  if (req.user!.userType === 'staff') {
    const staffLookup = await query<{ id: string }>('SELECT id FROM staff WHERE user_id = $1', [req.user!.id]);
    collectedByStaffId = staffLookup.rows[0]?.id ?? null;
  }
  res.status(201).json({ data: await paymentsService.recordPayment(req.body, collectedByStaffId) });
}));

router.post('/:id/reverse', authenticate, authorize('payments', 'delete'), validate({ body: reversePaymentSchema }), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await paymentsService.reversePayment((req.params.id as string), req.body.reason) });
}));

export default router;
