import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const recordPaymentSchema = z.object({
  installment_id: uuidSchema,
  amount: z.coerce.number().positive(),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']),
  reference_number: z.string().trim().max(100).optional(),
  payment_date: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const reversePaymentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const listPaymentsQuerySchema = z.object({
  status: z.enum(['success', 'failed', 'refunded', 'reversed']).optional(),
  chitMemberId: uuidSchema.optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
});
