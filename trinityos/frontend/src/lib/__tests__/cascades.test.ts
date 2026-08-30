import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store";
import { convertLeadToClient, markDealWon, recordPayment, sweepOverdueInvoices, recordClientPayment, scheduleFollowUp, completeFollowUp, rescheduleFollowUp } from "../cascades";
import { calculateClientFinancials } from "../calculations";
import { newId, nowIso } from "../id";
import type { Client, Deal, Invoice, Lead, Project } from "../../types";

function resetStore() {
  useStore.getState().resetAllData();
}

function addLead(overrides: Partial<Lead> = {}): Lead {
  const companyId = useStore.getState().company.id;
  const lead: Lead = {
    id: newId(),
    company_id: companyId,
    name: "Test Lead",
    company_name: "Test Co",
    email: "lead@test.co",
    phone: "",
    source: "Website",
    score: 50,
    status: "New",
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
    ...overrides,
  };
  useStore.getState().addEntity("leads", lead);
  return lead;
}

function addClientAndDeal(overrides: Partial<Deal> = {}) {
  const companyId = useStore.getState().company.id;
  const client = {
    id: newId(),
    company_id: companyId,
    name: "Acme Co",
    logo_initial: "A",
    status: "Active" as const,
    descriptor: "",
    location: "",
    website: "",
    health_score: 60,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
  };
  useStore.getState().addEntity("clients", client);

  const deal: Deal = {
    id: newId(),
    company_id: companyId,
    title: "Acme — Retainer",
    client_id: client.id,
    value: 50000,
    probability: 60,
    stage: "Negotiation",
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
    ...overrides,
  };
  useStore.getState().addEntity("deals", deal);
  return { client, deal };
}

function addInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const companyId = useStore.getState().company.id;
  const invoice: Invoice = {
    id: newId(),
    company_id: companyId,
    invoice_number: "INV-9001",
    client_id: "client-x",
    issue_date: nowIso(),
    due_date: nowIso(),
    amount: 1000,
    amount_paid: 0,
    status: "Unpaid",
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
    ...overrides,
  };
  useStore.getState().addEntity("invoices", invoice);
  return invoice;
}

beforeEach(() => {
  resetStore();
});

describe("convertLeadToClient", () => {
  it("creates a Client, a primary Contact, and a New-stage Deal carrying fields forward", () => {
    const lead = addLead({ name: "Priya Sharma", company_name: "Solstice Interiors", email: "priya@solstice.design" });

    const result = convertLeadToClient(lead.id);

    expect(result).toBeDefined();
    expect(result!.client.name).toBe("Solstice Interiors");
    expect(result!.client.source_lead_id).toBe(lead.id);
    expect(result!.contact.name).toBe("Priya Sharma");
    expect(result!.contact.email).toBe("priya@solstice.design");
    expect(result!.contact.is_primary).toBe(true);
    expect(result!.deal.client_id).toBe(result!.client.id);
    expect(result!.deal.stage).toBe("New");

    const updatedLead = useStore.getState().leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("Converted");
    expect(updatedLead?.converted_client_id).toBe(result!.client.id);
  });

  it("does nothing if the lead doesn't exist", () => {
    const result = convertLeadToClient("nonexistent-id");
    expect(result).toBeUndefined();
    expect(useStore.getState().clients).toHaveLength(0);
  });
});

describe("markDealWon", () => {
  it("creates a Project, three starter Tasks, and a draft Invoice, and marks the Deal Won", () => {
    const { client, deal } = addClientAndDeal({ value: 75000 });

    const result = markDealWon(deal.id);

    expect(result).toBeDefined();
    expect(result!.project.client_id).toBe(client.id);
    expect(result!.project.budget).toBe(75000);
    expect(result!.project.status).toBe("Planning");
    expect(result!.tasks).toHaveLength(3);
    expect(result!.invoice.amount).toBe(75000);
    expect(result!.invoice.status).toBe("Draft");
    expect(result!.invoice.project_id).toBe(result!.project.id);

    const updatedDeal = useStore.getState().deals.find((d) => d.id === deal.id);
    expect(updatedDeal?.stage).toBe("Won");
    expect(updatedDeal?.converted_project_id).toBe(result!.project.id);
  });

  it("does nothing if the deal has no linked client", () => {
    const companyId = useStore.getState().company.id;
    const orphanDeal: Deal = {
      id: newId(),
      company_id: companyId,
      title: "No client",
      value: 1000,
      probability: 50,
      stage: "Negotiation",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    useStore.getState().addEntity("deals", orphanDeal);

    const result = markDealWon(orphanDeal.id);
    expect(result).toBeUndefined();
    expect(useStore.getState().projects).toHaveLength(0);
  });
});

describe("recordPayment", () => {
  it("partial payment leaves the invoice Unpaid and adds a revenue entry for the paid amount", () => {
    const invoice = addInvoice({ amount: 1000, amount_paid: 0, status: "Unpaid" });

    recordPayment(invoice.id, 400, "UPI");

    const updated = useStore.getState().invoices.find((i) => i.id === invoice.id);
    expect(updated?.amount_paid).toBe(400);
    expect(updated?.status).toBe("Unpaid");

    const revenue = useStore.getState().revenue.filter((r) => r.invoice_id === invoice.id);
    expect(revenue).toHaveLength(1);
    expect(revenue[0].amount).toBe(400);
  });

  it("payment that covers the full balance marks the invoice Paid", () => {
    const invoice = addInvoice({ amount: 1000, amount_paid: 600, status: "Unpaid" });

    recordPayment(invoice.id, 400);

    const updated = useStore.getState().invoices.find((i) => i.id === invoice.id);
    expect(updated?.amount_paid).toBe(1000);
    expect(updated?.status).toBe("Paid");
  });

  it("surfaces an upsell insight when a fully-paid invoice's linked project is complete", () => {
    const companyId = useStore.getState().company.id;
    const project: Project = {
      id: newId(),
      company_id: companyId,
      name: "Finished Project",
      client_id: "client-x",
      status: "Completed",
      progress: 100,
      deadline: nowIso(),
      budget: 1000,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    useStore.getState().addEntity("projects", project);
    const invoice = addInvoice({ amount: 1000, amount_paid: 0, status: "Unpaid", project_id: project.id });

    recordPayment(invoice.id, 1000);

    const insights = useStore.getState().insights.filter((i) => i.source === "upsell" && i.entity_id === project.id);
    expect(insights).toHaveLength(1);
    expect(insights[0].dismissed).toBe(false);
  });

  it("does nothing if the invoice doesn't exist", () => {
    const result = recordPayment("nonexistent-id", 100);
    expect(result).toBeUndefined();
    expect(useStore.getState().payments).toHaveLength(0);
  });
});

describe("sweepOverdueInvoices", () => {
  it("flips Unpaid invoices past their due date to Overdue, and leaves others untouched", () => {
    const overdue = addInvoice({ status: "Unpaid", due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });
    const notYetDue = addInvoice({ status: "Unpaid", due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    const alreadyPaid = addInvoice({ status: "Paid", due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });

    sweepOverdueInvoices();

    const invoices = useStore.getState().invoices;
    expect(invoices.find((i) => i.id === overdue.id)?.status).toBe("Overdue");
    expect(invoices.find((i) => i.id === notYetDue.id)?.status).toBe("Unpaid");
    expect(invoices.find((i) => i.id === alreadyPaid.id)?.status).toBe("Paid");
  });
});

describe("recordClientPayment", () => {
  beforeEach(() => resetStore());

  it("records a payment and updates the derived financials — spec Section 78 worked example", () => {
    const { client } = addClientAndDeal();
    useStore.getState().updateEntity<Client>("clients", client.id, { project_value: 50000 });

    recordClientPayment(client.id, { amount: 15000, method: "UPI" });
    let updatedClient = useStore.getState().clients.find((c) => c.id === client.id)!;
    let financials = calculateClientFinancials(updatedClient, useStore.getState().payments);
    expect(financials.totalPaid).toBe(15000);
    expect(financials.balanceDue).toBe(35000);
    expect(financials.paidPercentage).toBe(30);

    recordClientPayment(client.id, { amount: 10000, method: "Cash" });
    updatedClient = useStore.getState().clients.find((c) => c.id === client.id)!;
    financials = calculateClientFinancials(updatedClient, useStore.getState().payments);
    expect(financials.totalPaid).toBe(25000);
    expect(financials.balanceDue).toBe(25000);
    expect(financials.paidPercentage).toBe(50);
  });

  it("also books the payment onto the revenue ledger", () => {
    const { client } = addClientAndDeal();
    recordClientPayment(client.id, { amount: 5000 });
    const revenue = useStore.getState().revenue.filter((r) => r.client_id === client.id);
    expect(revenue).toHaveLength(1);
    expect(revenue[0].amount).toBe(5000);
  });

  it("logs an activity for the payment", () => {
    const { client } = addClientAndDeal();
    recordClientPayment(client.id, { amount: 5000 });
    expect(useStore.getState().activities.some((a) => a.entity_type === "Payment")).toBe(true);
  });

  it("does nothing if the client doesn't exist", () => {
    const result = recordClientPayment("nonexistent", { amount: 100 });
    expect(result).toBeUndefined();
    expect(useStore.getState().payments).toHaveLength(0);
  });
});

describe("follow-up lifecycle", () => {
  beforeEach(() => resetStore());

  it("schedules a follow-up against a client", () => {
    const { client } = addClientAndDeal();
    const followUp = scheduleFollowUp({ clientId: client.id, date: new Date().toISOString(), reason: "Check on advance" });
    expect(useStore.getState().followUps).toHaveLength(1);
    expect(followUp.status).toBe("Scheduled");
  });

  it("completes a follow-up with an outcome and logs an activity", () => {
    const { client } = addClientAndDeal();
    const followUp = scheduleFollowUp({ clientId: client.id, date: new Date().toISOString() });
    completeFollowUp(followUp.id, "Interested", "Send proposal");
    const updated = useStore.getState().followUps.find((f) => f.id === followUp.id)!;
    expect(updated.status).toBe("Completed");
    expect(updated.outcome).toBe("Interested");
    expect(updated.next_action).toBe("Send proposal");
    expect(useStore.getState().activities.some((a) => a.summary.includes("outcome: Interested"))).toBe(true);
  });

  it("reschedules a follow-up to a new date without changing its status", () => {
    const { client } = addClientAndDeal();
    const followUp = scheduleFollowUp({ clientId: client.id, date: new Date().toISOString() });
    const newDate = new Date(Date.now() + 7 * 86400000).toISOString();
    rescheduleFollowUp(followUp.id, newDate, "11:00");
    const updated = useStore.getState().followUps.find((f) => f.id === followUp.id)!;
    expect(updated.follow_up_date).toBe(newDate);
    expect(updated.follow_up_time).toBe("11:00");
    expect(updated.status).toBe("Scheduled");
  });
});
