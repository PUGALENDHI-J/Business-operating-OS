import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

import authRoutes from '@/modules/auth/auth.routes';
import usersRoutes from '@/modules/users/users.routes';
import staffRoutes from '@/modules/staff/staff.routes';
import branchesRoutes from '@/modules/branches/branches.routes';
import leadsRoutes from '@/modules/leads/leads.routes';
import customersRoutes from '@/modules/customers/customers.routes';
import chitSchemesRoutes from '@/modules/chit-schemes/chit-schemes.routes';
import chitGroupsRoutes from '@/modules/chit-groups/chit-groups.routes';
import chitMembersRoutes from '@/modules/chit-members/chit-members.routes';
import installmentsRoutes from '@/modules/installments/installments.routes';
import paymentsRoutes from '@/modules/payments/payments.routes';
import auctionsRoutes from '@/modules/auctions/auctions.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import whatsappRoutes from '@/modules/whatsapp/whatsapp.routes';
import publicRoutes from '@/modules/public/public.routes';

export function createApp(): Express {
  const app = express();

  // Secure headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet());

  // CORS: explicit allow-list from env, not a wildcard — credentials
  // (Authorization header) are used, so '*' is not a valid option anyway.
  app.use(
    cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

  // Structured request logging. autoLogging skips /health to avoid noise
  // from load-balancer health checks.
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      redact: ['req.headers.authorization'],
    }),
  );

  // General API rate limit. Auth-specific endpoints apply a second,
  // tighter limiter on top of this (see auth.routes.ts).
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: config.env });
  });

  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/users', usersRoutes);
  v1.use('/staff', staffRoutes);
  v1.use('/branches', branchesRoutes);
  v1.use('/leads', leadsRoutes);
  v1.use('/customers', customersRoutes);
  v1.use('/chit-schemes', chitSchemesRoutes);
  v1.use('/chit-groups', chitGroupsRoutes);
  v1.use('/chit-members', chitMembersRoutes);
  v1.use('/installments', installmentsRoutes);
  v1.use('/payments', paymentsRoutes);
  v1.use('/auctions', auctionsRoutes);
  v1.use('/notifications', notificationsRoutes);
  v1.use('/whatsapp', whatsappRoutes);
  // Public routes are deliberately mounted with NO `authenticate` — this
  // is the one part of the API meant to be reachable by anonymous website
  // visitors. Every route inside public.routes.ts is read-only except the
  // lead-intake POST, which carries its own tighter rate limit.
  v1.use('/public', publicRoutes);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
