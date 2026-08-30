import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { createLeadSchema, leadService, NotFoundError, ConflictError } from "../services/leadService.js";

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

leadsRouter.get("/", async (req, res) => {
  const leads = await leadService.list(req.user!.companyId);
  res.json(leads);
});

leadsRouter.get("/:id", async (req, res) => {
  try {
    const lead = await leadService.get(req.user!.companyId, req.params.id);
    res.json(lead);
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

leadsRouter.post("/", requireRole("OWNER", "ADMIN", "MANAGER", "SALES"), async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const lead = await leadService.create(req.user!.companyId, parsed.data);
  res.status(201).json(lead);
});

leadsRouter.patch("/:id", requireRole("OWNER", "ADMIN", "MANAGER", "SALES"), async (req, res) => {
  try {
    const lead = await leadService.update(req.user!.companyId, req.params.id, req.body);
    res.json(lead);
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

leadsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
  try {
    await leadService.softDelete(req.user!.companyId, req.params.id);
    res.status(204).send();
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

leadsRouter.post("/:id/convert", requireRole("OWNER", "ADMIN", "MANAGER", "SALES"), async (req, res) => {
  try {
    const result = await leadService.convertToClient(req.user!.companyId, req.params.id, req.user!.id);
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    if (e instanceof ConflictError) return res.status(409).json({ error: e.message });
    throw e;
  }
});
