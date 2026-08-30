import type { Client, Deal, Expense, FollowUp, Goal, Invoice, Payment, Project, RevenueEntry, Task, AdCampaign } from "../types";

/** Total booked revenue in a date range (defaults to current calendar month). */
export function calculateRevenue(revenue: RevenueEntry[], from?: Date, to?: Date): number {
  const start = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ?? new Date();
  return revenue
    .filter((r) => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}

/** Monthly Recurring Revenue: sum of revenue entries flagged recurring, current month. */
export function calculateMRR(revenue: RevenueEntry[]): number {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return revenue
    .filter((r) => r.is_recurring && new Date(r.date) >= start)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function calculateExpenses(expenses: Expense[], from?: Date, to?: Date): number {
  const start = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ?? new Date();
  return expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateNetProfit(revenue: RevenueEntry[], expenses: Expense[], from?: Date, to?: Date): number {
  return calculateRevenue(revenue, from, to) - calculateExpenses(expenses, from, to);
}

export function calculateNetMargin(revenue: RevenueEntry[], expenses: Expense[], from?: Date, to?: Date): number {
  const rev = calculateRevenue(revenue, from, to);
  if (rev === 0) return 0;
  return (calculateNetProfit(revenue, expenses, from, to) / rev) * 100;
}

/** Sum of open (not Won/Lost) deal values. */
export function calculatePipelineValue(deals: Deal[]): number {
  return deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost").reduce((sum, d) => sum + d.value, 0);
}

/** Probability-weighted pipeline value. */
export function calculateWeightedPipeline(deals: Deal[]): number {
  return deals
    .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
    .reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
}

export function calculateWinRate(deals: Deal[]): number {
  const closed = deals.filter((d) => d.stage === "Won" || d.stage === "Lost");
  if (closed.length === 0) return 0;
  const won = closed.filter((d) => d.stage === "Won").length;
  return (won / closed.length) * 100;
}

export function calculateConversionRate(totalLeads: number, convertedLeads: number): number {
  if (totalLeads === 0) return 0;
  return (convertedLeads / totalLeads) * 100;
}

/** Cost per lead for a channel/campaign. */
export function calculateCPL(campaign: Pick<AdCampaign, "spend" | "leads_generated">): number {
  if (campaign.leads_generated === 0) return 0;
  return campaign.spend / campaign.leads_generated;
}

/** Customer acquisition cost. */
export function calculateCAC(campaign: Pick<AdCampaign, "spend" | "clients_generated">): number {
  if (campaign.clients_generated === 0) return 0;
  return campaign.spend / campaign.clients_generated;
}

/** Return on ad spend. */
export function calculateROAS(campaign: Pick<AdCampaign, "spend" | "revenue_attributed">): number {
  if (campaign.spend === 0) return 0;
  return campaign.revenue_attributed / campaign.spend;
}

export function calculateOutstandingReceivables(invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.status === "Unpaid" || i.status === "Overdue")
    .reduce((sum, i) => sum + (i.amount - i.amount_paid), 0);
}

export function calculateOverdueAmount(invoices: Invoice[]): number {
  return invoices.filter((i) => i.status === "Overdue").reduce((sum, i) => sum + (i.amount - i.amount_paid), 0);
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.target_value === 0) return 0;
  return Math.min(100, (goal.current_value / goal.target_value) * 100);
}

/** Non-linear expected-progress curve: front-loads Year->Quarter->Month->Week
 *  by elapsed-time fraction, used to classify a goal's status. */
export function calculateGoalStatus(goal: Goal): Goal["status"] {
  const start = new Date(goal.start_date).getTime();
  const end = new Date(goal.end_date).getTime();
  const now = Date.now();
  if (now <= start) return "On Track";
  const elapsedFraction = Math.min(1, (now - start) / Math.max(1, end - start));
  const expectedValue = goal.target_value * elapsedFraction;
  const actualValue = goal.current_value;
  if (expectedValue === 0) return "On Track";
  const ratio = actualValue / expectedValue;
  if (ratio >= 1.1) return "Ahead";
  if (ratio >= 0.9) return "On Track";
  if (ratio >= 0.6) return "At Risk";
  return "Behind";
}

export function calculateClientLifetimeValue(clientId: string, revenue: RevenueEntry[]): number {
  return revenue.filter((r) => r.client_id === clientId).reduce((sum, r) => sum + r.amount, 0);
}

export function calculateProjectHealth(project: Project): "normal" | "at-risk" | "complete" {
  if (project.status === "Completed") return "complete";
  if (project.status === "At Risk") return "at-risk";
  const overdue = new Date(project.deadline).getTime() < Date.now() && project.progress < 100;
  return overdue ? "at-risk" : "normal";
}

export function calculateOverdueProjectsCount(projects: Project[]): number {
  return projects.filter((p) => calculateProjectHealth(p) === "at-risk").length;
}

export function calculateTasksDueToday(tasks: Task[]): Task[] {
  const today = new Date().toDateString();
  return tasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === today && t.status !== "Done");
}

/**
 * Business Health Score, 0-100, sub-scored across Revenue / Sales / Marketing
 * / Finance / Ops / Retention / Goals — spec Section 4.
 * Each sub-score is a simple, transparent heuristic over live data only;
 * with no data in a dimension it scores neutral (50) rather than 0, so an
 * empty account doesn't read as "critical" before any activity has happened.
 */
export interface BusinessHealthBreakdown {
  overall: number;
  revenue: number;
  sales: number;
  marketing: number;
  finance: number;
  ops: number;
  retention: number;
  goals: number;
}

export function calculateBusinessHealth(data: {
  revenue: RevenueEntry[];
  expenses: Expense[];
  deals: Deal[];
  invoices: Invoice[];
  projects: Project[];
  clients: Client[];
  goals: Goal[];
  adCampaigns: AdCampaign[];
}): BusinessHealthBreakdown {
  const score = (val: number, hasData: boolean) => (hasData ? Math.max(0, Math.min(100, val)) : 50);

  const netMargin = calculateNetMargin(data.revenue, data.expenses);
  const revenueScore = score(50 + netMargin, data.revenue.length > 0 || data.expenses.length > 0);

  const winRate = calculateWinRate(data.deals);
  const salesScore = score(winRate, data.deals.length > 0);

  const avgRoas =
    data.adCampaigns.length > 0
      ? data.adCampaigns.reduce((sum, c) => sum + calculateROAS(c), 0) / data.adCampaigns.length
      : 0;
  const marketingScore = score(avgRoas * 25, data.adCampaigns.length > 0);

  const overdueRatio =
    data.invoices.length > 0
      ? data.invoices.filter((i) => i.status === "Overdue").length / data.invoices.length
      : 0;
  const financeScore = score(100 - overdueRatio * 100, data.invoices.length > 0);

  const atRiskRatio = data.projects.length > 0 ? calculateOverdueProjectsCount(data.projects) / data.projects.length : 0;
  const opsScore = score(100 - atRiskRatio * 100, data.projects.length > 0);

  const atRiskClients = data.clients.filter((c) => c.status === "At Risk").length;
  const retentionScore = score(
    data.clients.length > 0 ? 100 - (atRiskClients / data.clients.length) * 100 : 50,
    data.clients.length > 0
  );

  const goalScores = data.goals.map((g) => {
    const status = calculateGoalStatus(g);
    return status === "Ahead" ? 100 : status === "On Track" ? 80 : status === "At Risk" ? 45 : 15;
  });
  const goalsScore = score(
    goalScores.length > 0 ? goalScores.reduce((a, b) => a + b, 0) / goalScores.length : 50,
    data.goals.length > 0
  );

  const overall = Math.round(
    (revenueScore + salesScore + marketingScore + financeScore + opsScore + retentionScore + goalsScore) / 7
  );

  return {
    overall,
    revenue: Math.round(revenueScore),
    sales: Math.round(salesScore),
    marketing: Math.round(marketingScore),
    finance: Math.round(financeScore),
    ops: Math.round(opsScore),
    retention: Math.round(retentionScore),
    goals: Math.round(goalsScore),
  };
}

// ---------------------------------------------------------------------------
// CRM/Finance model upgrade — advance, balance, payment %, follow-ups
// (spec Sections 16-19, 25-28, 34, 78-79)
// ---------------------------------------------------------------------------

export interface ClientFinancials {
  projectValue: number;
  totalPaid: number;
  balanceDue: number;
  paidPercentage: number;
}

/**
 * Single source of truth for a client's money picture. Total Paid is the
 * sum of every Payment record linked to this client — never a value the
 * user has to compute by hand. For clients created before individual
 * payments were tracked, falls back to the legacy advance_paid/total_paid
 * fields already stored on the client record so nothing regresses.
 * Safely handles project_value = 0 (spec Section 17).
 */
export function calculateClientFinancials(
  client: Pick<Client, "id" | "project_value" | "advance_paid" | "total_paid">,
  payments: Payment[]
): ClientFinancials {
  const projectValue = client.project_value || 0;
  const clientPayments = payments.filter((p) => p.client_id === client.id);
  const totalPaid =
    clientPayments.length > 0 ? clientPayments.reduce((sum, p) => sum + p.amount, 0) : client.total_paid || client.advance_paid || 0;
  const balanceDue = Math.max(0, projectValue - totalPaid);
  const paidPercentage = projectValue > 0 ? Math.min(100, Math.round((totalPaid / projectValue) * 100)) : 0;
  return { projectValue, totalPaid, balanceDue, paidPercentage };
}

export type FollowUpBucket = "overdue" | "today" | "upcoming";

/** Buckets a follow-up date against today's date (time-of-day ignored for bucketing). */
export function bucketFollowUp(dateIso: string): FollowUpBucket {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateIso);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}

/** Splits every still-scheduled follow-up into Overdue / Today / Upcoming, each sorted soonest-first (spec Section 26). */
export function getActiveFollowUps(followUps: FollowUp[]): { overdue: FollowUp[]; today: FollowUp[]; upcoming: FollowUp[] } {
  const scheduled = followUps.filter((f) => f.status === "Scheduled");
  const overdue: FollowUp[] = [];
  const today: FollowUp[] = [];
  const upcoming: FollowUp[] = [];
  for (const f of scheduled) {
    const bucket = bucketFollowUp(f.follow_up_date);
    if (bucket === "overdue") overdue.push(f);
    else if (bucket === "today") today.push(f);
    else upcoming.push(f);
  }
  const byDate = (a: FollowUp, b: FollowUp) => new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime();
  return { overdue: overdue.sort(byDate), today: today.sort(byDate), upcoming: upcoming.sort(byDate) };
}
