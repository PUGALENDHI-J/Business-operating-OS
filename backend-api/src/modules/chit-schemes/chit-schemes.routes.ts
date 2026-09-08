import { z } from 'zod';
import { createCrudRouter } from '@/utils/crudFactory';

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  scheme_code: z.string().trim().min(1).max(30),
  chit_amount: z.coerce.number().positive(),
  member_count: z.coerce.number().int().positive(),
  duration_periods: z.coerce.number().int().positive(),
  frequency: z.enum(['weekly', 'monthly']),
  installment_amount: z.coerce.number().positive(),
  max_bid_percent: z.coerce.number().min(0).max(100).optional(),
  commission_percent: z.coerce.number().min(0).max(100).optional(),
});

const updateSchema = createSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export default createCrudRouter({
  permissionModule: 'chit_schemes',
  table: 'chit_schemes',
  selectColumns: [
    'id', 'name', 'scheme_code', 'chit_amount', 'member_count', 'duration_periods',
    'frequency', 'installment_amount', 'max_bid_percent', 'commission_percent',
    'is_active', 'created_at', 'updated_at',
  ],
  searchableColumns: ['name', 'scheme_code'],
  sortableColumns: ['name', 'chit_amount', 'created_at'],
  defaultSort: 'name',
  softDelete: true,
  createSchema,
  updateSchema,
});
