import { uuidSchema } from '@/utils/validators';
import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { createChitMemberSchema, updateChitMemberSchema } from './chit-members.schema';
import * as chitMembersService from './chit-members.service';

const router = Router();
const listQuerySchema = paginationQuerySchema.extend({ chitGroupId: uuidSchema.optional() });

router.get('/', authenticate, authorize('chit_members', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.status(200).json(await chitMembersService.listChitMembers(req.query as never));
}));

router.get('/:id', authenticate, authorize('chit_members', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await chitMembersService.getChitMemberById((req.params.id as string)) });
}));

router.post('/', authenticate, authorize('chit_members', 'write'), validate({ body: createChitMemberSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await chitMembersService.createChitMember(req.body) });
}));

router.patch('/:id', authenticate, authorize('chit_members', 'write'), validate({ body: updateChitMemberSchema }), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await chitMembersService.updateChitMember((req.params.id as string), req.body) });
}));

router.delete('/:id', authenticate, authorize('chit_members', 'delete'), asyncHandler(async (req, res) => {
  await chitMembersService.deleteChitMember((req.params.id as string));
  res.status(204).send();
}));

export default router;
