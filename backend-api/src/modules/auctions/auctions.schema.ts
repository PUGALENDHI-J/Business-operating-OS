import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const createAuctionSchema = z.object({
  chit_group_id: uuidSchema,
  cycle_number: z.coerce.number().int().positive(),
  scheduled_at: z.string().datetime(),
});

export const placeBidSchema = z.object({
  chit_member_id: uuidSchema,
  bid_percent: z.coerce.number().min(0).max(100),
});

export const completeAuctionSchema = z.object({
  winning_chit_member_id: uuidSchema,
});

export const updateAuctionSchema = z.object({
  status: z.enum(['scheduled', 'live', 'cancelled']).optional(),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});
