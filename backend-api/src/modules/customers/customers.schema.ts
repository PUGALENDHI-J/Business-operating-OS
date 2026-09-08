import { uuidSchema } from '@/utils/validators';
import { z } from 'zod';

export const createCustomerSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email().optional(),
  address_line1: z.string().trim().max(255).optional(),
  address_line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  date_of_birth: z.string().date().optional(),
  branch_id: uuidSchema.optional(),
  assigned_staff_id: uuidSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  kyc_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  is_active: z.boolean().optional(),
});

export const addDocumentSchema = z.object({
  document_type: z.string().trim().min(1).max(50),
  file_url: z.string().url(),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  rejection_reason: z.string().max(500).optional(),
});
