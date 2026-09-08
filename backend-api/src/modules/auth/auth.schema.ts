import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});

export const requestPasswordResetSchema = z.object({
  phone: z.string().trim().min(6).max(20),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});
