import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates and REPLACES req.body/query/params with the parsed (and
 * type-coerced, e.g. "2" -> 2 for query params) result.
 *
 * Express 5 defines req.query and req.params as getters (configurable,
 * but not plain writable properties), so a normal assignment throws
 * "Cannot set property ... which has only a getter". We use
 * Object.defineProperty to replace the getter with the validated,
 * coerced plain value for the remainder of this request. req.body is a
 * normal writable property (set by express.json()), so it's assigned
 * directly as before.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query);
      Object.defineProperty(req, 'query', { value: parsed, configurable: true, enumerable: true, writable: true });
    }
    if (schemas.params) {
      const parsed = schemas.params.parse(req.params);
      Object.defineProperty(req, 'params', { value: parsed, configurable: true, enumerable: true, writable: true });
    }
    next();
  };
}
