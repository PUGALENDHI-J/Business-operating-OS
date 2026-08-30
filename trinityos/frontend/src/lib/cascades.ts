import { useStore } from "./store";
import { newId, nowIso } from "./id";
import { initials } from "./format";
import { nextNumber } from "./numbering";
import type { Client, Contact, Deal, FollowUp, FollowUpOutcome, Invoice, Payment, Project, RevenueEntry, Task } from "../types";

/**
 * Lead Won -> Client + Contact + Deal.
 *
 * ENTER ONCE -> REUSE EVERYWHERE (spec Section 34): every field the user
 * already typed on the lead (contact name, business name, WhatsApp, phone,
 * email, requirement, estimated value, source, website, location) is
 * carried straight onto the new Client/Contact/Deal. Nothing is re-asked.
 */
export function convertLeadToClient(leadId: string) {
  const s = useStore.getState();
  const lead = s.leads.find((l) => l.id === leadId);
  if (!lead) return;

  const clientId = newId();
  const client: Client = {
    id: clientId,
    company_id: s.company.id,
    name: lead.company_name || lead.name,
    logo_initial: initials(lead.company_name || lead.name).slice(0, 1) || "C",
    status: "Active",
    descriptor: `Converted from lead — ${lead.source}`,
    location: lead.location || "—",
    website: lead.website || "",
    health_score: 70,
    source_lead_id: lead.id,
    client_number: nextNumber("CLI", s.clients.map((c) => c.client_number)),
    contact_person: lead.name,
    whatsapp: lead.whatsapp || lead.phone,
    phone: lead.phone,
    email: lead.email,
    requirement: lead.requirement,
    project_value: lead.estimated_value,
    advance_paid: 0,
    total_paid: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: lead.is_demo,
  };

  const contact: Contact = {
    id: newId(),
    company_id: s.company.id,
    client_id: clientId,
    name: lead.name,
    role: "Primary Contact",
    email: lead.email,
    phone: lead.phone,
    is_primary: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: lead.is_demo,
  };

  const deal: Deal = {
    id: newId(),
    company_id: s.company.id,
    title: `${client.name} — New Engagement`,
    client_id: clientId,
    lead_id: lead.id,
    value: lead.estimated_value || 0,
    probability: 40,
    stage: "New",
    owner_id: lead.assigned_to,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: lead.is_demo,
  };

  useStore.setState((st) => ({
    clients: [...st.clients, client],
    contacts: [...st.contacts, contact],
    deals: [...st.deals, deal],
    leads: st.leads.map((l) => (l.id === leadId ? { ...l, status: "Converted", converted_client_id: clientId } : l)),
  }));

  s.logActivity({ entity_type: "Client", entity_id: clientId, summary: `${client.name} converted from lead "${lead.name}"` });

  return { client, contact, deal };
}

/**
 * Deal Won -> Project + starter Tasks + draft Invoice.
 */
export function markDealWon(dealId: string) {
  const s = useStore.getState();
  const deal = s.deals.find((d) => d.id === dealId);
  if (!deal || !deal.client_id) return;
  const client = s.clients.find((c) => c.id === deal.client_id);
  if (!client) return;

  const projectId = newId();
  const project: Project = {
    id: projectId,
    company_id: s.company.id,
    name: deal.title,
    client_id: client.id,
    status: "Planning",
    progress: 0,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    owner_id: deal.owner_id,
    budget: deal.value,
    deal_id: deal.id,
    requirements: client.requirement,
    advance_paid: client.advance_paid || 0,
    total_paid: client.total_paid || client.advance_paid || 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: deal.is_demo,
  };

  const starterTasks: Task[] = ["Kickoff call", "Scope & timeline", "Draft deliverable"].map((title) => ({
    id: newId(),
    company_id: s.company.id,
    title,
    project_id: projectId,
    status: "To Do",
    priority: "MEDIUM",
    comments_count: 0,
    attachments_count: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: deal.is_demo,
  }));

  const invoice: Invoice = {
    id: newId(),
    company_id: s.company.id,
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    client_id: client.id,
    issue_date: nowIso(),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    amount: deal.value,
    amount_paid: 0,
    status: "Draft",
    project_id: projectId,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: deal.is_demo,
  };

  useStore.setState((st) => ({
    deals: st.deals.map((d) => (d.id === dealId ? { ...d, stage: "Won", converted_project_id: projectId } : d)),
    projects: [...st.projects, project],
    tasks: [...st.tasks, ...starterTasks],
    invoices: [...st.invoices, invoice],
  }));

  s.logActivity({ entity_type: "Project", entity_id: projectId, summary: `${project.name} created from won deal` });

  return { project, tasks: starterTasks, invoice };
}

/**
 * Record a payment against an invoice — atomically updates invoice status,
 * client balance (implicit via invoice), and the revenue ledger.
 */
export function recordPayment(invoiceId: string, amount: number, method: Payment["method"] = "Bank Transfer") {
  const s = useStore.getState();
  const invoice = s.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return;

  const payment: Payment = {
    id: newId(),
    company_id: s.company.id,
    invoice_id: invoiceId,
    amount,
    date: nowIso(),
    method,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: invoice.is_demo,
  };

  const newPaid = invoice.amount_paid + amount;
  const newStatus: Invoice["status"] = newPaid >= invoice.amount ? "Paid" : invoice.status === "Draft" ? "Unpaid" : invoice.status;

  const revenueEntry: RevenueEntry = {
    id: newId(),
    company_id: s.company.id,
    date: nowIso(),
    client_id: invoice.client_id,
    service: "Invoice payment",
    amount,
    is_recurring: false,
    invoice_id: invoiceId,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: invoice.is_demo,
  };

  useStore.setState((st) => ({
    payments: [...st.payments, payment],
    invoices: st.invoices.map((i) => (i.id === invoiceId ? { ...i, amount_paid: newPaid, status: newStatus } : i)),
    revenue: [...st.revenue, revenueEntry],
  }));

  s.logActivity({ entity_type: "Payment", entity_id: payment.id, summary: `Payment received for ${invoice.invoice_number}` });

  // If the linked project is now fully paid & complete, surface an upsell opportunity insight
  // instead of auto-messaging the client (spec Section 4).
  if (newStatus === "Paid" && invoice.project_id) {
    const project = s.projects.find((p) => p.id === invoice.project_id);
    if (project && project.progress >= 100) {
      useStore.setState((st) => ({
        insights: [
          {
            id: newId(),
            company_id: s.company.id,
            title: "Upsell Opportunity Identified",
            body: `${project.name} wrapped and its invoice is fully paid. This is a good moment to propose a follow-on engagement.`,
            severity: "info",
            source: "upsell",
            entity_type: "Project",
            entity_id: project.id,
            dismissed: false,
            created_at: nowIso(),
            updated_at: nowIso(),
            is_demo: invoice.is_demo,
          },
          ...st.insights,
        ],
      }));
    }
  }

  return payment;
}

/** Sweep invoices whose due date has passed and mark them Overdue. Call on app load / periodically. */
export function sweepOverdueInvoices() {
  useStore.setState((st) => ({
    invoices: st.invoices.map((i) =>
      i.status === "Unpaid" && new Date(i.due_date).getTime() < Date.now() ? { ...i, status: "Overdue" } : i
    ),
  }));
}

/**
 * Add Payment (spec Section 18-19). Records a payment directly against a
 * client's running balance — no invoice required. Total Paid, Balance, and
 * Payment % all update immediately because they're derived from this ledger
 * (see calculateClientFinancials), and if the payment is linked to a
 * project it's also recorded on the revenue ledger so Dashboard/Revenue
 * stay in sync.
 */
export function recordClientPayment(
  clientId: string,
  input: { amount: number; date?: string; method?: Payment["method"]; reference?: string; notes?: string; projectId?: string | null }
) {
  const s = useStore.getState();
  const client = s.clients.find((c) => c.id === clientId);
  if (!client) return;

  const payment: Payment = {
    id: newId(),
    company_id: s.company.id,
    client_id: clientId,
    project_id: input.projectId ?? null,
    amount: input.amount,
    date: input.date || nowIso(),
    method: input.method || "UPI",
    reference: input.reference,
    notes: input.notes,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: client.is_demo,
  };

  const revenueEntry: RevenueEntry = {
    id: newId(),
    company_id: s.company.id,
    date: payment.date,
    client_id: clientId,
    service: "Client payment",
    amount: input.amount,
    is_recurring: false,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: client.is_demo,
  };

  useStore.setState((st) => ({
    payments: [...st.payments, payment],
    revenue: [...st.revenue, revenueEntry],
    clients: st.clients.map((c) => (c.id === clientId ? { ...c, updated_at: nowIso() } : c)),
  }));

  s.logActivity({ entity_type: "Payment", entity_id: payment.id, summary: `Payment of ${payment.amount} recorded for ${client.name}` });

  return payment;
}

/** Schedule a follow-up against a lead, client, or project (spec Section 25). */
export function scheduleFollowUp(input: {
  leadId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  date: string;
  time?: string;
  reason?: string;
  nextAction?: string;
}) {
  const s = useStore.getState();
  const followUp: FollowUp = {
    id: newId(),
    company_id: s.company.id,
    lead_id: input.leadId ?? null,
    client_id: input.clientId ?? null,
    project_id: input.projectId ?? null,
    follow_up_date: input.date,
    follow_up_time: input.time,
    reason: input.reason,
    next_action: input.nextAction,
    status: "Scheduled",
    outcome: null,
    completed_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
  };
  useStore.setState((st) => ({ followUps: [...st.followUps, followUp] }));
  s.logActivity({ entity_type: "Lead", entity_id: input.leadId || input.clientId || input.projectId || followUp.id, summary: "Follow-up scheduled" });
  return followUp;
}

/** Mark a follow-up done with an outcome, logging an activity automatically (spec Section 27). */
export function completeFollowUp(followUpId: string, outcome: FollowUpOutcome, nextAction?: string) {
  const s = useStore.getState();
  const followUp = s.followUps.find((f) => f.id === followUpId);
  if (!followUp) return;

  useStore.setState((st) => ({
    followUps: st.followUps.map((f) =>
      f.id === followUpId
        ? { ...f, status: "Completed", outcome, completed_at: nowIso(), updated_at: nowIso(), next_action: nextAction ?? f.next_action }
        : f
    ),
  }));

  s.logActivity({ entity_type: "Lead", entity_id: followUp.lead_id || followUp.client_id || followUp.project_id || followUp.id, summary: `Follow-up completed — outcome: ${outcome}` });
}

/** Reschedule an existing follow-up to a new date/time (spec Section 28). */
export function rescheduleFollowUp(followUpId: string, date: string, time?: string) {
  useStore.setState((st) => ({
    followUps: st.followUps.map((f) => (f.id === followUpId ? { ...f, follow_up_date: date, follow_up_time: time, updated_at: nowIso() } : f)),
  }));
}
