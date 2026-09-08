import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const createStaffSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(100),
  branch_id: uuidSchema,
  employee_code: z.string().trim().max(30).optional(),
  designation: z.string().trim().max(100).optional(),
  joining_date: z.string().date().optional(),
  role_ids: z.array(uuidSchema).min(1),
});

export const updateStaffSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().optional(),
  branch_id: uuidSchema.optional(),
  designation: z.string().trim().max(100).optional(),
  is_active: z.boolean().optional(),
  role_ids: z.array(uuidSchema).optional(),
});
