import { PrismaClient } from "@prisma/client";

// Singleton Prisma client. In serverless/dev-reload environments this avoids
// exhausting the Postgres connection pool on every hot reload.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
