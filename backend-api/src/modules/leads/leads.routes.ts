import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { createLeadSchema, updateLeadSchema, convertLeadSchema, leadStatusEnum } from './leads.schema';
import * as leadsService from './leads.service';

const router = Router();
const listQuerySchema = paginationQuerySchema.extend({ status: leadStatusEnum.optional() });

router.get(
  '/',
  authenticate,
  authorize('leads', 'read'),
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    res.status(200).json(await leadsService.listLeads(req.query as never));
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize('leads', 'read'),
  asyncHandler(async (req, res) => {
    res.status(200).json({ data: await leadsService.getLeadById((req.params.id as string)) });
  }),
);

router.post(
  '/',
  authenticate,
  authorize('leads', 'write'),
  validate({ body: createLeadSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await leadsService.createLead(req.body) });
  }),
);

router.patch(
  '/:id',
  authenticate,
  authorize('leads', 'write'),
  validate({ body: updateLeadSchema }),
  asyncHandler(async (req, res) => {
    res.status(200).json({ data: await leadsService.updateLead((req.params.id as string), req.body) });
  }),
);

router.post(
  '/:id/convert',
  authenticate,
  authorize('leads', 'write'),
  validate({ body: convertLeadSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await leadsService.convertLead((req.params.id as string), req.body) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize('leads', 'delete'),
  asyncHandler(async (req, res) => {
    await leadsService.deleteLead((req.params.id as string));
    res.status(204).send();
  }),
);

export default router;
