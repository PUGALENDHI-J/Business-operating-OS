import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { createStaffSchema, updateStaffSchema } from './staff.schema';
import * as staffService from './staff.service';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('staff', 'read'),
  validate({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await staffService.listStaff(req.query as never);
    res.status(200).json(result);
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize('staff', 'read'),
  asyncHandler(async (req, res) => {
    res.status(200).json({ data: await staffService.getStaffById((req.params.id as string)) });
  }),
);

router.post(
  '/',
  authenticate,
  authorize('staff', 'write'),
  validate({ body: createStaffSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await staffService.createStaff(req.body) });
  }),
);

router.patch(
  '/:id',
  authenticate,
  authorize('staff', 'write'),
  validate({ body: updateStaffSchema }),
  asyncHandler(async (req, res) => {
    res.status(200).json({ data: await staffService.updateStaff((req.params.id as string), req.body) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize('staff', 'delete'),
  asyncHandler(async (req, res) => {
    await staffService.deleteStaff((req.params.id as string));
    res.status(204).send();
  }),
);

export default router;
