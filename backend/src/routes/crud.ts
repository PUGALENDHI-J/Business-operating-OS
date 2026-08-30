import { prisma } from "../lib/prisma.js";
import { buildCrudRouter } from "../lib/crudService.js";

const OWNER_ADMIN = ["OWNER", "ADMIN"] as const;
const MANAGE = ["OWNER", "ADMIN", "MANAGER"] as const;
const OPERATE = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"] as const;
const SELL = ["OWNER", "ADMIN", "MANAGER", "SALES"] as const;
const FINANCE = ["OWNER", "ADMIN", "FINANCE"] as const;

export const clientsRouter = buildCrudRouter(prisma.client, {
  writeRoles: [...SELL],
  mapCreate: (b, companyId) => ({
    companyId,
    name: b.name,
    logoInitial: (typeof b.name === "string" ? b.name : "C").charAt(0).toUpperCase(),
    status: b.status ?? "Active",
    descriptor: b.descriptor,
    location: b.location,
    website: b.website,
    healthScore: b.healthScore ?? 50,
  }),
  mapUpdate: (b) => b,
});

export const projectsRouter = buildCrudRouter(prisma.project, {
  writeRoles: [...OPERATE],
  mapCreate: (b, companyId) => ({
    companyId,
    name: b.name,
    clientId: b.clientId,
    status: b.status ?? "Planning",
    progress: b.progress ?? 0,
    deadline: b.deadline ? new Date(b.deadline as string) : undefined,
    budget: b.budget ?? 0,
    dealId: b.dealId,
  }),
  mapUpdate: (b) => ({
    ...b,
    ...(b.deadline ? { deadline: new Date(b.deadline as string) } : {}),
  }),
});

export const tasksRouter = buildCrudRouter(prisma.task, {
  writeRoles: [...OPERATE],
  mapCreate: (b, companyId) => ({
    companyId,
    title: b.title,
    projectId: b.projectId,
    status: b.status ?? "To Do",
    priority: b.priority ?? "MEDIUM",
    assigneeId: b.assigneeId,
    dueDate: b.dueDate ? new Date(b.dueDate as string) : undefined,
  }),
  mapUpdate: (b) => ({
    ...b,
    ...(b.dueDate ? { dueDate: new Date(b.dueDate as string) } : {}),
  }),
});

export const expensesRouter = buildCrudRouter(prisma.expense, {
  writeRoles: [...FINANCE],
  mapCreate: (b, companyId) => ({
    companyId,
    date: b.date ? new Date(b.date as string) : new Date(),
    category: b.category ?? "Other",
    vendor: b.vendor,
    amount: b.amount,
    notes: b.notes,
  }),
  mapUpdate: (b) => b,
});

export const revenueRouter = buildCrudRouter(prisma.revenueEntry, {
  writeRoles: [...FINANCE],
  mapCreate: (b, companyId) => ({
    companyId,
    date: b.date ? new Date(b.date as string) : new Date(),
    clientId: b.clientId,
    service: b.service,
    amount: b.amount,
    isRecurring: b.isRecurring ?? false,
  }),
  mapUpdate: (b) => b,
});

export const goalsRouter = buildCrudRouter(prisma.goal, {
  writeRoles: [...OWNER_ADMIN],
  mapCreate: (b, companyId) => ({
    companyId,
    title: b.title,
    metric: b.metric,
    targetValue: b.targetValue,
    currentValue: b.currentValue ?? 0,
    endDate: b.endDate ? new Date(b.endDate as string) : new Date(),
    status: b.status ?? "On Track",
  }),
  mapUpdate: (b) => ({
    ...b,
    ...(b.endDate ? { endDate: new Date(b.endDate as string) } : {}),
  }),
});

export const proposalsRouter = buildCrudRouter(prisma.proposal, {
  writeRoles: [...SELL],
  mapCreate: (b, companyId) => ({
    companyId,
    proposalNumber: b.proposalNumber ?? `PRP-${Math.floor(1000 + Math.random() * 9000)}`,
    clientId: b.clientId,
    dealId: b.dealId,
    title: b.title,
    amount: b.amount,
    status: b.status ?? "Draft",
    validUntil: b.validUntil ? new Date(b.validUntil as string) : undefined,
  }),
  mapUpdate: (b) => b,
});

export const servicesRouter = buildCrudRouter(prisma.service, {
  writeRoles: [...MANAGE],
  mapCreate: (b, companyId) => ({
    companyId,
    name: b.name,
    category: b.category,
    defaultPrice: b.defaultPrice ?? 0,
    billingType: b.billingType ?? "One-time",
  }),
  mapUpdate: (b) => b,
});

export const documentsRouter = buildCrudRouter(prisma.document, {
  writeRoles: [...OPERATE],
  mapCreate: (b, companyId) => ({
    companyId,
    name: b.name,
    category: b.category ?? "Other",
    linkedType: b.linkedType,
    linkedId: b.linkedId,
    sizeKb: b.sizeKb ?? 0,
    storageUrl: b.storageUrl,
  }),
  mapUpdate: (b) => b,
});

export const adCampaignsRouter = buildCrudRouter(prisma.adCampaign, {
  writeRoles: [...MANAGE],
  mapCreate: (b, companyId) => ({
    companyId,
    channel: b.channel,
    name: b.name,
    spend: b.spend ?? 0,
    leadsGenerated: b.leadsGenerated ?? 0,
    clientsGenerated: b.clientsGenerated ?? 0,
    revenueAttributed: b.revenueAttributed ?? 0,
    status: b.status ?? "Active",
  }),
  mapUpdate: (b) => b,
});

export const usersRouter = buildCrudRouter(prisma.user, {
  writeRoles: [...OWNER_ADMIN],
  mapCreate: (b, companyId) => ({
    companyId,
    name: b.name,
    email: b.email,
    role: b.role ?? "EMPLOYEE",
    avatarInitials: typeof b.name === "string" ? b.name.slice(0, 2).toUpperCase() : "??",
  }),
  mapUpdate: (b) => b,
});

export const aiInsightsRouter = buildCrudRouter(prisma.aiInsight, {
  // AI insights are written by the AI service, not end users — only dismissing (an update) is user-triggered.
  writeRoles: [...OPERATE],
  mapCreate: (b, companyId) => ({
    companyId,
    title: b.title,
    body: b.body,
    severity: b.severity ?? "info",
    source: b.source ?? "alert",
    entityType: b.entityType,
    entityId: b.entityId,
  }),
  mapUpdate: (b) => b,
});
