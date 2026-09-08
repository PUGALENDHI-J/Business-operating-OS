import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/** Wraps async route handlers so thrown/rejected errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request failed validation',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, 'API error (5xx)');
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // Postgres unique_violation
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with this value already exists.' },
    });
    return;
  }

  // Postgres check_violation — a database-level business rule was broken
  // (e.g. chit_amount != installment_amount * member_count).
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23514') {
    const constraint = (err as { constraint?: string }).constraint;
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `The request violates a data rule${constraint ? ` (${constraint})` : ''}.`,
      },
    });
    return;
  }

  // Postgres foreign_key_violation — referenced row doesn't exist.
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'This request references a record that does not exist.' },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
  });
}
