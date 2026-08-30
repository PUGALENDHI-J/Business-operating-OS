import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store";
import { generateNotifications, notifyNewLead } from "../notifications";
import { scheduleFollowUp, recordClientPayment } from "../cascades";
import { newId, nowIso } from "../id";
import type { Client, Invoice, Project } from "../../types";

function resetStore() {
  useStore.getState().resetAllData();
}

function addClient(overrides: Partial<Client> = {}): Client {
  const companyId = useStore.getState().company.id;
  const client: Client = {
    id: newId(),
    company_id: companyId,
    name: "Prasanth Kumar",
    logo_initial: "P",
    status: "Active",
    descriptor: "",
    location: "",
    website: "",
    health_score: 60,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
    ...overrides,
  };
  useStore.getState().addEntity("clients", client);
  return client;
}

describe("generateNotifications", () => {
  beforeEach(() => resetStore());

  it("raises an overdue follow-up alert", () => {
    const client = addClient();
    const past = new Date(Date.now() - 2 * 86400000).toISOString();
    scheduleFollowUp({ clientId: client.id, date: past, reason: "Check in" });

    const fresh = generateNotifications();
    expect(fresh.some((n) => n.title === "Follow-up overdue" && n.entity_type === "FollowUp")).toBe(true);
  });

  it("raises a payment-due notification for a client with an outstanding balance", () => {
    const client = addClient();
    useStore.getState().updateEntity<Client>("clients", client.id, { project_value: 50000 });
    recordClientPayment(client.id, { amount: 15000 });

    const fresh = generateNotifications();
    const paymentNotif = fresh.find((n) => n.title === "Payment due" && n.entity_id === client.id);
    expect(paymentNotif).toBeTruthy();
    expect(paymentNotif!.body).toContain("35,000");
  });

  it("does not raise a payment-due notification once the balance is fully paid", () => {
    const client = addClient();
    useStore.getState().updateEntity<Client>("clients", client.id, { project_value: 50000 });
    recordClientPayment(client.id, { amount: 50000 });

    const fresh = generateNotifications();
    expect(fresh.some((n) => n.title === "Payment due" && n.entity_id === client.id)).toBe(false);
  });

  it("flags an overdue invoice", () => {
    const companyId = useStore.getState().company.id;
    const invoice: Invoice = {
      id: newId(),
      company_id: companyId,
      invoice_number: "INV-9999",
      client_id: "client-x",
      issue_date: nowIso(),
      due_date: nowIso(),
      amount: 1000,
      amount_paid: 0,
      status: "Overdue",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    useStore.getState().addEntity("invoices", invoice);

    const fresh = generateNotifications();
    expect(fresh.some((n) => n.title === "Invoice overdue" && n.entity_id === invoice.id)).toBe(true);
  });

  it("flags a project at risk and one approaching its deadline, but not a completed project", () => {
    const companyId = useStore.getState().company.id;
    const client = addClient();
    const atRisk: Project = {
      id: newId(),
      company_id: companyId,
      name: "At-risk site",
      client_id: client.id,
      status: "At Risk",
      progress: 40,
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      budget: 10000,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    const dueSoon: Project = {
      id: newId(),
      company_id: companyId,
      name: "Due-soon site",
      client_id: client.id,
      status: "In Progress",
      progress: 80,
      deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
      budget: 10000,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    const completed: Project = {
      id: newId(),
      company_id: companyId,
      name: "Finished site",
      client_id: client.id,
      status: "Completed",
      progress: 100,
      deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
      budget: 10000,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    useStore.getState().addEntity("projects", atRisk);
    useStore.getState().addEntity("projects", dueSoon);
    useStore.getState().addEntity("projects", completed);

    const fresh = generateNotifications();
    expect(fresh.some((n) => n.title === "Project at risk" && n.entity_id === atRisk.id)).toBe(true);
    expect(fresh.some((n) => n.title === "Project deadline approaching" && n.entity_id === dueSoon.id)).toBe(true);
    expect(fresh.some((n) => n.entity_id === completed.id)).toBe(false);
  });

  it("never raises the same alert twice for the same entity", () => {
    const client = addClient();
    const past = new Date(Date.now() - 2 * 86400000).toISOString();
    scheduleFollowUp({ clientId: client.id, date: past });

    const firstBatch = generateNotifications();
    useStore.setState((st) => ({ notifications: [...firstBatch, ...st.notifications] }));

    const secondBatch = generateNotifications();
    expect(secondBatch.some((n) => n.title === "Follow-up overdue")).toBe(false);
  });
});

describe("notifyNewLead", () => {
  beforeEach(() => resetStore());

  it("immediately adds a New lead notification", () => {
    notifyNewLead({ id: "lead-1", name: "Saravana Kumar", company_name: "SK Traders" });
    const notifications = useStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("New lead");
    expect(notifications[0].body).toContain("Saravana Kumar");
  });
});
