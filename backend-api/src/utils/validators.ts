import { z } from 'zod';

/**
 * Zod's built-in z.string().uuid() (v4+) strictly validates the RFC-4122
 * version/variant nibbles. PostgreSQL's UUID column type does not
 * enforce this — any 32-hex-digit value in the standard 8-4-4-4-12
 * grouping is accepted — and gen_random_uuid() output naturally passes
 * strict validation, but hand-written development/seed identifiers
 * (e.g. '50000000-0000-0000-0000-000000000001', used throughout the
 * Phase 2 dev seed for readability) do not, since their version nibble
 * is '0' rather than 1-5. Using a shape-only check here matches what the
 * database itself actually accepts.
 */
export const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID');
