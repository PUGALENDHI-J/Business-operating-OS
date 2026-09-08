/**
 * Every error response from this API follows the same envelope:
 *   { "error": { "code": "STRING_CODE", "message": "human readable", "details"?: [...] } }
 * Every success response follows:
 *   { "data": <payload> }                       — single resource
 *   { "data": [...], "meta": { pagination } }    — list resource
 *
 * ApiError subclasses map 1:1 to HTTP status codes so the central error
 * handler (middleware/errorHandler.ts) never has to guess a status code.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown) {
    super(422, 'VALIDATION_ERROR', 'The request failed validation', details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflicting resource state') {
    super(409, 'CONFLICT', message);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests') {
    super(429, 'TOO_MANY_REQUESTS', message);
  }
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
