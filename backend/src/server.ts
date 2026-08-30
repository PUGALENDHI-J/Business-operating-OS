import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { authRouter } from "./routes/auth.js";
import { leadsRouter } from "./routes/leads.js";
import { dealsRouter } from "./routes/deals.js";
import { invoicesRouter } from "./routes/invoices.js";
import {
  clientsRouter,
  projectsRouter,
  tasksRouter,
  expensesRouter,
  revenueRouter,
  goalsRouter,
  proposalsRouter,
  servicesRouter,
  documentsRouter,
  adCampaignsRouter,
  usersRouter,
  aiInsightsRouter,
} from "./routes/crud.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  cookieSession({
    name: "trinityai_session",
    keys: [process.env.SESSION_SECRET ?? "dev-secret-change-me"],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: "lax",
  })
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Auth
app.use("/api/auth", authRouter);

// Reference resources with full cascades (see services/*.ts)
app.use("/api/leads", leadsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/invoices", invoicesRouter);

// CRUD resources built on the generic factory (lib/crudService.ts)
app.use("/api/clients", clientsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/revenue", revenueRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/ad-campaigns", adCampaignsRouter);
app.use("/api/users", usersRouter);
app.use("/api/ai-insights", aiInsightsRouter);

// Centralized error handler — nothing should fail silently.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`TrinityAI Business OS API listening on http://localhost:${PORT}`);
});
