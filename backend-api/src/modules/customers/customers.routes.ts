import { uuidSchema } from '@/utils/validators';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { ForbiddenError } from '@/utils/errors';
import { query } from '@/db/pool';
import { createCustomerSchema, updateCustomerSchema, addDocumentSchema, reviewDocumentSchema } from './customers.schema';
import * as customersService from './customers.service';

const router = Router();
const listQuerySchema = paginationQuerySchema.extend({
  kycStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  branchId: uuidSchema.optional(),
});

router.get('/', authenticate, authorize('customers', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.status(200).json(await customersService.listCustomers(req.query as never));
}));

router.get('/:id', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerById((req.params.id as string)) });
}));

router.post('/', authenticate, authorize('customers', 'write'), validate({ body: createCustomerSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await customersService.createCustomer(req.body) });
}));

router.patch('/:id', authenticate, authorize('customers', 'write'), validate({ body: updateCustomerSchema }), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.updateCustomer((req.params.id as string), req.body) });
}));

router.delete('/:id', authenticate, authorize('customers', 'delete'), asyncHandler(async (req, res) => {
  await customersService.deleteCustomer((req.params.id as string));
  res.status(204).send();
}));

// --- Profile tabs -------------------------------------------------------

router.get('/:id/documents', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerDocuments((req.params.id as string)) });
}));

router.post('/:id/documents', authenticate, authorize('customers', 'write'), validate({ body: addDocumentSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await customersService.addCustomerDocument((req.params.id as string), req.body.document_type, req.body.file_url) });
}));

router.patch('/documents/:documentId/review', authenticate, authorize('customers', 'write'), validate({ body: reviewDocumentSchema }), asyncHandler(async (req, res) => {
  // Reviewing a document requires the actor to be staff — a customer's
  // own documents can never be self-approved via this endpoint.
  if (req.user!.userType !== 'staff') throw new ForbiddenError('Only staff can review documents');
  const staffLookup = await query<{ id: string }>('SELECT id FROM staff WHERE user_id = $1', [req.user!.id]);
  const staffId = staffLookup.rows[0]?.id;
  if (!staffId) throw new ForbiddenError('No staff profile linked to this account');
  res.status(200).json({ data: await customersService.reviewCustomerDocument((req.params.documentId as string), staffId, req.body.status, req.body.rejection_reason) });
}));

router.get('/:id/chit-memberships', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerMemberships((req.params.id as string)) });
}));

router.get('/:id/payments', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerPaymentHistory((req.params.id as string)) });
}));

router.get('/:id/outstanding', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerOutstanding((req.params.id as string)) });
}));

router.get('/:id/auctions', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerAuctionHistory((req.params.id as string)) });
}));

router.get('/:id/followups', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerFollowups((req.params.id as string)) });
}));

router.get('/:id/whatsapp-history', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerWhatsappHistory((req.params.id as string)) });
}));

router.get('/:id/activity', authenticate, authorize('customers', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await customersService.getCustomerActivity((req.params.id as string)) });
}));

export default router;
