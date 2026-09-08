import bcrypt from 'bcryptjs';
import { query } from '@/db/pool';
import { config } from '@/config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { sha256Hex, generateRandomToken } from '@/utils/crypto';
import { UnauthorizedError, NotFoundError } from '@/utils/errors';
import { logger } from '@/utils/logger';

interface UserRow {
  id: string;
  user_type: 'staff' | 'customer';
  full_name: string;
  phone: string;
  email: string | null;
  password_hash: string | null;
  is_active: boolean;
}

async function getRoleNames(userId: string): Promise<string[]> {
  const result = await query<{ name: string }>(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.name);
}

async function issueTokenPair(user: UserRow, ip?: string, userAgent?: string) {
  const roles = await getRoleNames(user.id);
  const accessToken = signAccessToken({ sub: user.id, userType: user.user_type, roles });

  // Create the refresh_tokens row first so we have an id to embed in the JWT
  // (sessionId), enabling per-session revocation later.
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  const inserted = await query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    // token_hash is filled in immediately below once we know the JWT; use a
    // temporary placeholder hash first is unnecessary — instead we sign the
    // refresh JWT with the row id as sessionId, then hash that JWT and
    // update the row in the same transaction-free two-step (acceptable here
    // since the row is invisible/unusable until token_hash matches).
    [user.id, 'pending', expiresAt, ip ?? null, userAgent ?? null],
  );
  const sessionId = inserted.rows[0].id;
  const refreshToken = signRefreshToken({ sub: user.id, sessionId });
  await query(`UPDATE refresh_tokens SET token_hash = $1 WHERE id = $2`, [sha256Hex(refreshToken), sessionId]);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, fullName: user.full_name, phone: user.phone, email: user.email, userType: user.user_type, roles },
  };
}

export async function login(phone: string, password: string, ip?: string, userAgent?: string) {
  const result = await query<UserRow>(
    `SELECT id, user_type, full_name, phone, email, password_hash, is_active
       FROM users WHERE phone = $1 AND deleted_at IS NULL`,
    [phone],
  );
  const user = result.rows[0];

  // Constant-shape response whether the phone doesn't exist or the
  // password is wrong — never reveal which one via response content or
  // significant timing difference (bcrypt.compare against a fixed dummy
  // hash keeps the timing profile close to a real check).
  const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8u1TfeCsB1M9d1p1yQhVLd3ns0ay8O';
  const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? dummyHash);

  if (!user || !user.is_active || !user.password_hash || !passwordMatches) {
    throw new UnauthorizedError('Invalid phone number or password');
  }

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
  logger.info({ userId: user.id }, 'auth.login.success');
  return issueTokenPair(user, ip, userAgent);
}

export async function refresh(refreshToken: string, ip?: string, userAgent?: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenHash = sha256Hex(refreshToken);
  const sessionResult = await query<{ id: string; user_id: string; revoked_at: string | null; expires_at: string }>(
    `SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE id = $1 AND token_hash = $2`,
    [payload.sessionId, tokenHash],
  );
  const session = sessionResult.rows[0];

  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
    // Reuse of a revoked/rotated token is a signal of possible token
    // theft — revoke every active session for this user as a precaution.
    if (session) {
      await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [
        session.user_id,
      ]);
      logger.warn({ userId: session.user_id }, 'auth.refresh.reuse_detected — all sessions revoked');
    }
    throw new UnauthorizedError('Session is no longer valid, please log in again');
  }

  const userResult = await query<UserRow>(
    `SELECT id, user_type, full_name, phone, email, password_hash, is_active FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [session.user_id],
  );
  const user = userResult.rows[0];
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Account is inactive or no longer exists');
  }

  // Rotate: revoke the old session row and mint a brand new one.
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [session.id]);
  const next = await issueTokenPair(user, ip, userAgent);
  await query(`UPDATE refresh_tokens SET replaced_by_token_id = (SELECT id FROM refresh_tokens WHERE token_hash = $1) WHERE id = $2`, [
    sha256Hex(next.refreshToken),
    session.id,
  ]);
  return next;
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = sha256Hex(refreshToken);
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash]);
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

/**
 * Generates a password reset token and persists its hash. Returns the
 * RAW token so the caller (route handler) can hand it off to a delivery
 * channel. Per Phase 1 audit, no SMS/email provider is wired up yet, so
 * in non-production environments the raw token is returned in the API
 * response to unblock development/testing; production MUST replace that
 * with real delivery and stop returning it (see docs).
 */
export async function requestPasswordReset(phone: string): Promise<{ devToken?: string }> {
  const result = await query<{ id: string }>(`SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL AND is_active`, [
    phone,
  ]);
  const user = result.rows[0];

  // Always behave the same whether or not the phone exists, so this
  // endpoint can't be used to enumerate registered phone numbers.
  if (!user) {
    return {};
  }

  const rawToken = generateRandomToken();
  const expiresAt = new Date(Date.now() + config.passwordReset.tokenExpiresInMinutes * 60 * 1000);
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, sha256Hex(rawToken), expiresAt],
  );

  logger.info({ userId: user.id }, 'auth.password_reset.requested');
  return config.env === 'production' ? {} : { devToken: rawToken };
}

export async function confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  const result = await query<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  const record = result.rows[0];
  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    throw new UnauthorizedError('Reset token is invalid, expired, or already used');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, record.user_id]);
  await query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [record.id]);
  // Force re-login everywhere as a security precaution after a reset.
  await logoutAllSessions(record.user_id);
  logger.info({ userId: record.user_id }, 'auth.password_reset.confirmed');
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const result = await query<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  if (!user?.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
}

export async function getUserById(userId: string) {
  const result = await query<Pick<UserRow, 'id' | 'full_name' | 'phone' | 'email' | 'user_type'>>(
    `SELECT id, full_name, phone, email, user_type FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (!result.rows[0]) throw new NotFoundError('User');
  const roles = await getRoleNames(userId);
  return { ...result.rows[0], roles };
}
