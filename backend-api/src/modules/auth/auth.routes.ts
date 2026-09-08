import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { config } from '@/config/env';
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
  changePasswordSchema,
} from './auth.schema';
import * as authService from './auth.service';

const router = Router();

// Auth endpoints get a tighter rate limit than the general API — these
// are the most attractive brute-force targets (login, password reset).
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later.' } },
});

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    const result = await authService.login(phone, password, req.ip, req.headers['user-agent']);
    res.status(200).json({ data: result });
  }),
);

router.post(
  '/refresh',
  authLimiter,
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken, req.ip, req.headers['user-agent']);
    res.status(200).json({ data: result });
  }),
);

router.post(
  '/logout',
  validate({ body: logoutSchema }),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  }),
);

router.post(
  '/password-reset/request',
  authLimiter,
  validate({ body: requestPasswordResetSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.phone);
    // Generic message regardless of whether the phone exists (prevents
    // account enumeration). devToken is only ever present outside
    // production — see auth.service.ts.
    res.status(200).json({
      data: {
        message: 'If that phone number is registered, a password reset code has been sent.',
        ...result,
      },
    });
  }),
);

router.post(
  '/password-reset/confirm',
  authLimiter,
  validate({ body: confirmPasswordResetSchema }),
  asyncHandler(async (req, res) => {
    await authService.confirmPasswordReset(req.body.token, req.body.newPassword);
    res.status(200).json({ data: { message: 'Password has been reset. Please log in again.' } });
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ data: { message: 'Password changed successfully.' } });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json({ data: { ...user, permissions: [...req.user!.permissions] } });
  }),
);

export default router;
