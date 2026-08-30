import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { createInvoiceSchema, recordPaymentSchema, invoiceService } from "../services/invoiceService.js";
import { NotFoundError } from "../services/leadService.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const FINANCE = ["OWNER", "ADMIN", "FINANCE"] as const;

invoicesRouter.get("/", async (req, res) => {
  res.json(await invoiceService.list(req.user!.companyId));
});

invoicesRouter.get("/:id", async (req, res) => {
  try {
    res.json(await invoiceService.get(req.user!.companyId, req.params.id));
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});

invoicesRouter.post("/", requireRole(...FINANCE), async (req, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await invoiceService.create(req.user!.companyId, parsed.data));
});

invoicesRouter.post("/:id/payments", requireRole(...FINANCE), async (req, res) => {
  const parsed = recordPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await invoiceService.recordPayment(req.user!.companyId, req.params.id, parsed.data, req.user!.id);
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
    throw e;
  }
});
