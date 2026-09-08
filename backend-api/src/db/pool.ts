import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

/**
 * Thin query wrapper. All modules go through this rather than importing
 * `pool` directly, so query logging/metrics stay in one place.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params as never[]);
  const durationMs = Date.now() - start;
  logger.debug({ text, durationMs, rowCount: result.rowCount }, 'db.query');
  return result;
}

/**
 * Runs `fn` inside a single transaction. Rolls back on any thrown error.
 * Use for any write that touches more than one table (e.g. recording a
 * payment and updating the installment's paid_amount together).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
