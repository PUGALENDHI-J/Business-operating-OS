import { z } from 'zod';
import { createCrudRouter } from '@/utils/crudFactory';

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(20),
  address_line1: z.string().trim().max(255).optional(),
  address_line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  phone: z.string().trim().max(20).optional(),
});

const updateSchema = createSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export default createCrudRouter({
  permissionModule: 'branches',
  table: 'branches',
  selectColumns: ['id', 'name', 'code', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'phone', 'is_active', 'created_at', 'updated_at'],
  searchableColumns: ['name', 'code', 'city'],
  sortableColumns: ['name', 'code', 'created_at'],
  defaultSort: 'name',
  softDelete: true,
  createSchema,
  updateSchema,
});
