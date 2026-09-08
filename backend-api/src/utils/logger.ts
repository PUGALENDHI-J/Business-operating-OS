import pino from 'pino';
import { config } from '@/config/env';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (config.env === 'production' ? 'info' : 'debug'),
  transport:
    config.env === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  // Never log request/response bodies containing secrets. Redact at the
  // logger level as a second line of defense on top of route-level care.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      '*.password_hash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});
