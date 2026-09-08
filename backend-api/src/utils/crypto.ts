import crypto from 'crypto';

/** SHA-256 hex digest — used to store refresh/reset tokens without keeping the raw value. */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Generates a URL-safe random token for password resets. */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
