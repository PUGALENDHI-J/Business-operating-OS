import { createApp } from '@/app';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { pool } from '@/db/pool';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Nachiyar API listening on port ${config.port} (${config.env})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
