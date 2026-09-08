import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const leadStatusEnum = z.enum(['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost']);

export const createLeadSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email().optional(),
  source: z.string().trim().max(50).optional(),
  interested_scheme_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  assigned_staff_id: uuidSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: leadStatusEnum.optional(),
});

export const convertLeadSchema = z.object({
  address_line1: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  date_of_birth: z.string().date().optional(),
});
