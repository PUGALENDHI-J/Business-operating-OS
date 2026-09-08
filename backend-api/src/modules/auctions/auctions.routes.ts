import { uuidSchema } from '@/utils/validators';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { paginationQuerySchema } from '@/utils/pagination';
import { createAuctionSchema, placeBidSchema, completeAuctionSchema, updateAuctionSchema } from './auctions.schema';
import * as auctionsService from './auctions.service';

const router = Router();
const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled']).optional(),
  chitGroupId: uuidSchema.optional(),
});

async function resolveStaffId(userId: string, userType: string): Promise<string | null> {
  if (userType !== 'staff') return null;
  const result = await query<{ id: string }>('SELECT id FROM staff WHERE user_id = $1', [userId]);
  return result.rows[0]?.id ?? null;
}

router.get('/', authenticate, authorize('auctions', 'read'), validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.status(200).json(await auctionsService.listAuctions(req.query as never));
}));

router.get('/:id', authenticate, authorize('auctions', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await auctionsService.getAuctionById((req.params.id as string)) });
}));

router.get('/:id/bids', authenticate, authorize('auctions', 'read'), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await auctionsService.getAuctionBids((req.params.id as string)) });
}));

router.post('/', authenticate, authorize('auctions', 'write'), validate({ body: createAuctionSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await auctionsService.createAuction(req.body) });
}));

router.patch('/:id', authenticate, authorize('auctions', 'write'), validate({ body: updateAuctionSchema }), asyncHandler(async (req, res) => {
  res.status(200).json({ data: await auctionsService.updateAuction((req.params.id as string), req.body) });
}));

router.post('/:id/bids', authenticate, authorize('auctions', 'write'), validate({ body: placeBidSchema }), asyncHandler(async (req, res) => {
  const bidId = await auctionsService.placeBid((req.params.id as string), req.body.chit_member_id, req.body.bid_percent);
  res.status(201).json({ data: { id: bidId } });
}));

router.post('/:id/complete', authenticate, authorize('auctions', 'write'), validate({ body: completeAuctionSchema }), asyncHandler(async (req, res) => {
  const staffId = await resolveStaffId(req.user!.id, req.user!.userType);
  res.status(200).json({ data: await auctionsService.completeAuction((req.params.id as string), req.body.winning_chit_member_id, staffId) });
}));

export default router;
