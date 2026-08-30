import { describe, expect, it } from "vitest";
import {
  calculateRevenue,
  calculateMRR,
  calculateNetProfit,
  calculateNetMargin,
  calculatePipelineValue,
  calculateWeightedPipeline,
  calculateWinRate,
  calculateCPL,
  calculateCAC,
  calculateROAS,
  calculateOutstandingReceivables,
  calculateOverdueAmount,
  calculateGoalProgress,
  calculateGoalStatus,
  calculateBusinessHealth,
  calculateClientFinancials,
  bucketFollowUp,
  getActiveFollowUps,
} from "../calculations";
import type { Client, Deal, Expense, FollowUp, Goal, Invoice, Payment, RevenueEntry } from "../../types";

const base = {
  company_id: "c1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_demo: false,
};

function revenueEntry(overrides: Partial<RevenueEntry>): RevenueEntry {
  return { id: crypto.randomUUID(), date: new Date().toISOString(), amount: 0, is_recurring: false, ...base, ...overrides };
}
function expense(overrides: Partial<Expense>): Expense {
  return { id: crypto.randomUUID(), date: new Date().toISOString(), category: "Other", vendor: "Test", amount: 0, ...base, ...overrides };
}
function deal(overrides: Partial<Deal>): Deal {
  return { id: crypto.randomUUID(), title: "Deal", value: 0, probability: 50, stage: "New", ...base, ...overrides };
}
function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: crypto.randomUUID(),
    invoice_number: "INV-1",
    client_id: "client-1",
    issue_date: new Date().toISOString(),
    due_date: new Date().toISOString(),
    amount: 0,
    amount_paid: 0,
    status: "Unpaid",
    ...base,
    ...overrides,
  };
}

describe("revenue & profit calculations", () => {
  it("sums revenue only within the given range", () => {
    const now = new Date();
    const inRange = revenueEntry({ amount: 100, date: now.toISOString() });
    const outOfRange = revenueEntry({ amount: 999, date: new Date(2020, 0, 1).toISOString() });
    const total = calculateRevenue([inRange, outOfRange], new Date(now.getFullYear(), now.getMonth(), 1), now);
    expect(total).toBe(100);
  });

  it("MRR only counts recurring entries in the current month", () => {
    const recurring = revenueEntry({ amount: 500, is_recurring: true });
    const oneOff = revenueEntry({ amount: 800, is_recurring: false });
    expect(calculateMRR([recurring, oneOff])).toBe(500);
  });

  it("net profit and net margin derive from revenue minus expenses", () => {
    const rev = [revenueEntry({ amount: 1000 })];
    const exp = [expense({ amount: 400 })];
    expect(calculateNetProfit(rev, exp)).toBe(600);
    expect(calculateNetMargin(rev, exp)).toBeCloseTo(60);
  });

  it("net margin is 0 (not NaN/Infinity) when there is no revenue", () => {
    expect(calculateNetMargin([], [expense({ amount: 100 })])).toBe(0);
  });
});

describe("pipeline calculations", () => {
  it("pipeline value excludes Won and Lost deals", () => {
    const deals = [deal({ value: 100, stage: "New" }), deal({ value: 200, stage: "Won" }), deal({ value: 50, stage: "Lost" })];
    expect(calculatePipelineValue(deals)).toBe(100);
  });

  it("weighted pipeline applies probability", () => {
    const deals = [deal({ value: 1000, probability: 25, stage: "Qualified" })];
    expect(calculateWeightedPipeline(deals)).toBe(250);
  });

  it("win rate is won / (won + lost), ignoring open deals", () => {
    const deals = [deal({ stage: "Won" }), deal({ stage: "Won" }), deal({ stage: "Lost" }), deal({ stage: "New" })];
    expect(calculateWinRate(deals)).toBeCloseTo((2 / 3) * 100);
  });

  it("win rate is 0 with no closed deals, not NaN", () => {
    expect(calculateWinRate([deal({ stage: "New" })])).toBe(0);
  });
});

describe("marketing efficiency calculations", () => {
  it("CPL, CAC, and ROAS compute correctly and guard against divide-by-zero", () => {
    expect(calculateCPL({ spend: 1000, leads_generated: 10 })).toBe(100);
    expect(calculateCPL({ spend: 1000, leads_generated: 0 })).toBe(0);
    expect(calculateCAC({ spend: 1000, clients_generated: 5 })).toBe(200);
    expect(calculateCAC({ spend: 1000, clients_generated: 0 })).toBe(0);
    expect(calculateROAS({ spend: 500, revenue_attributed: 2000 })).toBe(4);
    expect(calculateROAS({ spend: 0, revenue_attributed: 2000 })).toBe(0);
  });
});

describe("finance calculations", () => {
  it("outstanding receivables sum unpaid + overdue balances only", () => {
    const invoices = [
      invoice({ amount: 100, amount_paid: 0, status: "Unpaid" }),
      invoice({ amount: 100, amount_paid: 40, status: "Overdue" }),
      invoice({ amount: 100, amount_paid: 100, status: "Paid" }),
    ];
    expect(calculateOutstandingReceivables(invoices)).toBe(160);
    expect(calculateOverdueAmount(invoices)).toBe(60);
  });
});

describe("goal progress & status", () => {
  it("progress is clamped at 100%", () => {
    const goal: Goal = {
      id: "g1",
      title: "Test Goal",
      metric: "Revenue",
      target_value: 100,
      current_value: 250,
      start_date: new Date(Date.now() - 1000).toISOString(),
      end_date: new Date(Date.now() + 1000).toISOString(),
      status: "On Track",
      ...base,
    };
    expect(calculateGoalProgress(goal)).toBe(100);
  });

  it("classifies a goal that's far behind its time-elapsed pace as Behind", () => {
    const start = Date.now() - 300 * 24 * 60 * 60 * 1000;
    const end = Date.now() + 65 * 24 * 60 * 60 * 1000; // ~82% of a 365-day goal elapsed
    const goal: Goal = {
      id: "g2",
      title: "Slow goal",
      metric: "Revenue",
      target_value: 1000,
      current_value: 50, // way below the ~82% expected pace
      start_date: new Date(start).toISOString(),
      end_date: new Date(end).toISOString(),
      status: "On Track",
      ...base,
    };
    expect(calculateGoalStatus(goal)).toBe("Behind");
  });

  it("classifies a goal ahead of pace as Ahead", () => {
    const start = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const end = Date.now() + 100 * 24 * 60 * 60 * 1000; // 50% elapsed
    const goal: Goal = {
      id: "g3",
      title: "Fast goal",
      metric: "Revenue",
      target_value: 1000,
      current_value: 900, // way above the 50% expected pace
      start_date: new Date(start).toISOString(),
      end_date: new Date(end).toISOString(),
      status: "On Track",
      ...base,
    };
    expect(calculateGoalStatus(goal)).toBe("Ahead");
  });
});

describe("business health score", () => {
  it("scores every dimension neutral (50) when there is no data anywhere", () => {
    const health = calculateBusinessHealth({
      revenue: [],
      expenses: [],
      deals: [],
      invoices: [],
      projects: [],
      clients: [],
      goals: [],
      adCampaigns: [],
    });
    expect(health.revenue).toBe(50);
    expect(health.sales).toBe(50);
    expect(health.overall).toBe(50);
  });

  it("overall score is the average of the seven sub-scores", () => {
    const health = calculateBusinessHealth({
      revenue: [revenueEntry({ amount: 1000 })],
      expenses: [],
      deals: [deal({ stage: "Won" }), deal({ stage: "Won" })],
      invoices: [invoice({ amount: 100, amount_paid: 100, status: "Paid" })],
      projects: [],
      clients: [],
      goals: [],
      adCampaigns: [],
    });
    const manualAverage =
      (health.revenue + health.sales + health.marketing + health.finance + health.ops + health.retention + health.goals) / 7;
    expect(health.overall).toBe(Math.round(manualAverage));
  });
});

function client(overrides: Partial<Client>): Client {
  return {
    id: "client-1",
    name: "Test Client",
    logo_initial: "T",
    status: "Active",
    descriptor: "",
    location: "",
    website: "",
    health_score: 70,
    ...base,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment>): Payment {
  return { id: crypto.randomUUID(), amount: 0, date: new Date().toISOString(), method: "UPI", ...base, ...overrides };
}

function followUp(overrides: Partial<FollowUp>): FollowUp {
  return { id: crypto.randomUUID(), follow_up_date: new Date().toISOString(), status: "Scheduled", ...base, ...overrides };
}

describe("calculateClientFinancials — spec Section 78/79 worked example", () => {
  it("₹50,000 project + ₹15,000 advance → 30% paid, ₹35,000 balance", () => {
    const c = client({ id: "c1", project_value: 50000 });
    const payments = [payment({ client_id: "c1", amount: 15000 })];
    const result = calculateClientFinancials(c, payments);
    expect(result.totalPaid).toBe(15000);
    expect(result.balanceDue).toBe(35000);
    expect(result.paidPercentage).toBe(30);
  });

  it("adding a further ₹10,000 payment → 50% paid, ₹25,000 balance", () => {
    const c = client({ id: "c1", project_value: 50000 });
    const payments = [payment({ client_id: "c1", amount: 15000 }), payment({ client_id: "c1", amount: 10000 })];
    const result = calculateClientFinancials(c, payments);
    expect(result.totalPaid).toBe(25000);
    expect(result.balanceDue).toBe(25000);
    expect(result.paidPercentage).toBe(50);
  });

  it("falls back to legacy advance_paid/total_paid when no Payment records exist yet", () => {
    const c = client({ id: "c1", project_value: 100000, advance_paid: 30000, total_paid: 30000 });
    const result = calculateClientFinancials(c, []);
    expect(result.totalPaid).toBe(30000);
    expect(result.balanceDue).toBe(70000);
  });

  it("never divides by zero when project value is 0", () => {
    const c = client({ id: "c1", project_value: 0 });
    const result = calculateClientFinancials(c, [payment({ client_id: "c1", amount: 5000 })]);
    expect(result.paidPercentage).toBe(0);
    expect(result.balanceDue).toBe(0);
  });

  it("clamps balance at 0 and percentage at 100 when overpaid", () => {
    const c = client({ id: "c1", project_value: 10000 });
    const result = calculateClientFinancials(c, [payment({ client_id: "c1", amount: 15000 })]);
    expect(result.balanceDue).toBe(0);
    expect(result.paidPercentage).toBe(100);
  });

  it("ignores payments belonging to other clients", () => {
    const c = client({ id: "c1", project_value: 50000 });
    const payments = [payment({ client_id: "c1", amount: 10000 }), payment({ client_id: "other-client", amount: 99999 })];
    const result = calculateClientFinancials(c, payments);
    expect(result.totalPaid).toBe(10000);
  });
});

describe("follow-up bucketing", () => {
  it("buckets a past date as overdue", () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(bucketFollowUp(past)).toBe("overdue");
  });

  it("buckets today's date as today", () => {
    expect(bucketFollowUp(new Date().toISOString())).toBe("today");
  });

  it("buckets a future date as upcoming", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(bucketFollowUp(future)).toBe("upcoming");
  });

  it("getActiveFollowUps groups and sorts by date, excluding completed ones", () => {
    const overdue = followUp({ id: "1", follow_up_date: new Date(Date.now() - 2 * 86400000).toISOString() });
    const today = followUp({ id: "2", follow_up_date: new Date().toISOString() });
    const upcomingLater = followUp({ id: "3", follow_up_date: new Date(Date.now() + 5 * 86400000).toISOString() });
    const upcomingSooner = followUp({ id: "4", follow_up_date: new Date(Date.now() + 1 * 86400000).toISOString() });
    const completed = followUp({ id: "5", follow_up_date: new Date(Date.now() - 86400000).toISOString(), status: "Completed" });

    const result = getActiveFollowUps([overdue, today, upcomingLater, upcomingSooner, completed]);
    expect(result.overdue.map((f) => f.id)).toEqual(["1"]);
    expect(result.today.map((f) => f.id)).toEqual(["2"]);
    expect(result.upcoming.map((f) => f.id)).toEqual(["4", "3"]);
  });
});
