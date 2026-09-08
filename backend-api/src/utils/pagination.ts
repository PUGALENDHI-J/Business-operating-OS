import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Whitelists sortBy against known columns to prevent SQL injection via ORDER BY. */
export function safeSortColumn(requested: string | undefined, allowed: string[], fallback: string): string {
  if (requested && allowed.includes(requested)) return requested;
  return fallback;
}

export function buildPaginationMeta(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
