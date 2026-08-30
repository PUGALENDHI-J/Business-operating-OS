import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

// Session-based auth: cookie-session (see server.ts) stores { userId }.
// Every authenticated request gets req.user + req.user.companyId attached
// here, which every service call below uses to scope its Prisma queries.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; companyId: string; role: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as { userId?: string } | undefined;
  if (!session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.deletedAt) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.user = { id: user.id, companyId: user.companyId, role: user.role, email: user.email };
  next();
}
