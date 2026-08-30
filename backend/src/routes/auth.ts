import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.passwordHash || user.deletedAt) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  (req.session as { userId?: string }).userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
});

authRouter.post("/logout", (req, res) => {
  req.session = null;
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
});

const registerSchema = z.object({
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * First-run signup: creates a Company + an OWNER User. Every subsequent user
 * for that company is invited via POST /api/users (Team page in the
 * frontend) and always inherits companyId from the inviting OWNER/ADMIN's
 * session — never from client input, so company scoping can't be spoofed.
 */
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const { company, user } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const company = await tx.company.create({ data: { name: parsed.data.companyName } });
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "OWNER",
        avatarInitials: parsed.data.name.slice(0, 2).toUpperCase(),
      },
    });
    return { company, user };
  });

  (req.session as { userId?: string }).userId = user.id;
  res.status(201).json({ company, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
