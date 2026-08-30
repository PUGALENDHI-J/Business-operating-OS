import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { createDealSchema, dealService } from "../services/dealService.js";
import { NotFoundError, ConflictError } from "../services/leadService.js";

export const dealsRouter = Router();
dealsRouter.use(requireAuth);

const SELL = ["OWNER", "ADMIN", "MANAGER", "SALES"] as const;

dealsRouter.get("/", async (req, res) => {
  res.json(await dealService.list(req.user!.companyId));
});

dealsRouter.get("/:id", async (req, res) => {
  try {
    res.json(await dealService.get(req.user!.companyId, req.params.id));
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

dealsRouter.post("/", requireRole(...SELL), async (req, res) => {
  const parsed = createDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await dealService.create(req.user!.companyId, parsed.data));
});

/** Drag a deal to a new pipeline column. Moving to "Won" should go through /mark-won instead, which runs the cascade. */
dealsRouter.patch("/:id/stage", requireRole(...SELL), async (req, res) => {
  const stage = String(req.body?.stage ?? "");
  if (!stage) return res.status(400).json({ error: "stage is required" });
  if (stage === "Won") return res.status(400).json({ error: "Use POST /:id/mark-won to move a deal to Won — it runs the project/invoice cascade" });
  try {
    res.json(await dealService.updateStage(req.user!.companyId, req.params.id, stage));
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

dealsRouter.post("/:id/mark-won", requireRole(...SELL), async (req, res) => {
  try {
    const result = await dealService.markWon(req.user!.companyId, req.params.id, req.user!.id);
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    if (e instanceof ConflictError) return res.status(409).json({ error: e.message });
    throw e;
  }
});
