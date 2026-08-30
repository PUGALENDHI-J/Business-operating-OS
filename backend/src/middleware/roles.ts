import type { NextFunction, Request, Response } from "express";

export type Role = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "EMPLOYEE" | "FINANCE";

/**
 * Role-guard middleware. Mount after requireAuth. Enforced here at the API
 * boundary AND expected to be re-checked inside each service's query (e.g. a
 * FINANCE-only filter in invoiceService) per spec Section 4 — the frontend
 * hiding a button is a UX nicety, never the actual authorization boundary.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowed.includes(req.user.role as Role)) {
      return res.status(403).json({ error: `Requires one of: ${allowed.join(", ")}` });
    }
    next();
  };
}
