import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),

  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: required('DB_USER', 'nachiyar_dev'),
    password: required('DB_PASSWORD', 'devpassword'),
    database: required('DB_NAME', 'nachiyar_chit'),
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    // In production these MUST be set via environment variables / secret
    // manager. The fallbacks below exist only so local dev doesn't crash
    // on a missing .env — they are deliberately obvious placeholders and
    // must never be used outside development.
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-only-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? '7', 10),
  },

  passwordReset: {
    tokenExpiresInMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MIN ?? '30', 10),
  },

  cors: {
    // Comma-separated list of allowed origins. Default is permissive for
    // local dev only; production deployment MUST set this explicitly.
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
};

// WhatsApp credentials are read from env per project security rules, but
// Phase 3 does not implement sending — these are declared for Phase 8 and
// deliberately unused today.
export const whatsappEnv = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  apiVersion: process.env.WHATSAPP_API_VERSION,
};
