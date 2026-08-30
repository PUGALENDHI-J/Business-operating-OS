/**
 * Generates the next human-readable record number for a prefix, e.g.
 * LEAD-0001, LEAD-0002 … Looks at the highest existing number carrying
 * that prefix so it keeps counting correctly even with demo data or
 * imported/old records that never had a number assigned.
 */
export function nextNumber(prefix: string, existing: (string | undefined)[]): string {
  let max = 0;
  for (const value of existing) {
    if (!value) continue;
    const m = value.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = max + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
