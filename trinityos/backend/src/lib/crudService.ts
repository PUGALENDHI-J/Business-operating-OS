import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import type { Role } from "../middleware/roles.js";

/**
 * Minimal shape every Prisma model delegate satisfies (Client, Project,
 * Task, Expense, RevenueEntry, Goal, Proposal, Service, Document,
 * AdCampaign, User, ...). Typed loosely on purpose — this factory trades a
 * little type precision for not hand-writing the same list/get/create/
 * update/delete boilerplate eleven times. Any resource whose writes need
 * real validation or a multi-table cascade (Deal, Invoice, Lead) should NOT
 * use this factory — write a dedicated service instead, the way
 * leadService.ts, dealService.ts, and invoiceService.ts do.
 */
interface Delegate {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
}

interface CrudRouterOptions {
  /** Roles allowed to create/update/delete. Reads are open to any authenticated user. */
  writeRoles: Role[];
  /** Maps req.body -> Prisma `data` for create. Always stamp companyId here, never trust the client for it. */
  mapCreate: (body: Record<string, unknown>, companyId: string) => Record<string, unknown>;
  /** Maps req.body -> Prisma `data` for update (partial). */
  mapUpdate: (body: Record<string, unknown>) => Record<string, unknown>;
}

export function buildCrudRouter(delegate: Delegate, opts: CrudRouterOptions): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    const rows = await delegate.findMany({
      where: { companyId: req.user!.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  });

  router.get("/:id", async (req, res) => {
    const row = await delegate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId, deletedAt: null },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });

  router.post("/", requireRole(...opts.writeRoles), async (req, res) => {
    const data = opts.mapCreate(req.body, req.user!.companyId);
    const row = await delegate.create({ data });
    res.status(201).json(row);
  });

  router.patch("/:id", requireRole(...opts.writeRoles), async (req, res) => {
    const existing = await delegate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const row = await delegate.update({ where: { id: req.params.id }, data: opts.mapUpdate(req.body) });
    res.json(row);
  });

  router.delete("/:id", requireRole(...opts.writeRoles), async (req, res) => {
    const existing = await delegate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await delegate.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  });

  return router;
}
