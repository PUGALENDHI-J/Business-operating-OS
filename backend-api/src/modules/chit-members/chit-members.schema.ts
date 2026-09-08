import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const createChitMemberSchema = z.object({
  chit_group_id: uuidSchema,
  customer_id: uuidSchema,
  member_serial_no: z.coerce.number().int().positive(),
  join_date: z.string().date().optional(),
});

export const updateChitMemberSchema = z.object({
  status: z.enum(['active', 'defaulted', 'completed', 'exited']).optional(),
  exit_date: z.string().date().optional(),
  exit_reason: z.string().max(500).optional(),
});
