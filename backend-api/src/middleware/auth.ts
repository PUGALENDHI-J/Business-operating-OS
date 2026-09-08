import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { query } from '@/db/pool';
import { asyncHandler } from '@/middleware/errorHandler';

export interface AuthenticatedUser {
  id: string;
  userType: 'staff' | 'customer';
  roles: string[];
  /** Set of "module:action" strings, e.g. "customers:write". */
  permissions: Set<string>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the Bearer JWT, then loads the user's CURRENT permission set
 * from the database (roles -> role_permissions -> permissions) on every
 * request. This is deliberately not cached in the token payload: if an
 * admin revokes a role mid-session, the change takes effect on the very
 * next request instead of waiting for token expiry.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }

  const userResult = await query<{ id: string; user_type: 'staff' | 'customer'; is_active: boolean }>(
    `SELECT id, user_type, is_active FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [payload.sub],
  );
  const user = userResult.rows[0];
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Account is inactive or no longer exists');
  }

  const permsResult = await query<{ module: string; action: string; role_name: string }>(
    `SELECT p.module, p.action, r.name AS role_name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1`,
    [user.id],
  );

  const roles = [...new Set(permsResult.rows.map((r) => r.role_name))];
  const permissions = new Set(permsResult.rows.map((r) => `${r.module}:${r.action}`));

  req.user = { id: user.id, userType: user.user_type, roles, permissions };
  next();
});

/**
 * Route-level RBAC guard. Usage: `authorize('customers', 'write')`.
 * This is the SAME permission model enforced consistently across every
 * module — there is no per-route hardcoded role check anywhere in this
 * codebase, only permission lookups against the database.
 */
export function authorize(module: string, action: 'read' | 'write' | 'delete') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const required = `${module}:${action}`;
    if (!req.user.permissions.has(required)) {
      next(new ForbiddenError(`Missing permission: ${required}`));
      return;
    }
    next();
  };
}
