import { useStore } from "./store";
import { newId, nowIso } from "./id";
import { getActiveFollowUps, calculateClientFinancials } from "./calculations";
import { formatCurrency, formatDate } from "./format";
import type { AppNotification, Lead } from "../types";

function notificationKey(n: Pick<AppNotification, "entity_type" | "entity_id" | "type" | "title">): string {
  return `${n.entity_type ?? ""}:${n.entity_id ?? ""}:${n.type}:${n.title}`;
}

type NotificationDraft = Omit<AppNotification, "id" | "company_id" | "created_at" | "updated_at" | "is_demo" | "read">;

/**
 * Scans current business state and returns any alerts that don't already
 * have an open notification for the same entity/type/title (spec Section
 * 29). Pure — call runNotificationSweep() to actually persist the result.
 * Never invents an alert for a condition that isn't true in the data.
 */
export function generateNotifications(): AppNotification[] {
  const s = useStore.getState();
  const currency = s.company.currency;
  const drafts: NotificationDraft[] = [];

  const { overdue, today } = getActiveFollowUps(s.followUps);
  const followUpWho = (leadId?: string | null, clientId?: string | null) =>
    s.leads.find((l) => l.id === leadId)?.name || s.clients.find((c) => c.id === clientId)?.name || "Customer";
  const followUpLink = (clientId?: string | null) => (clientId ? `/crm/clients/${clientId}` : "/crm/leads");

  overdue.forEach((f) => {
    drafts.push({
      title: "Follow-up overdue",
      body: `${followUpWho(f.lead_id, f.client_id)} — was due ${formatDate(f.follow_up_date)}`,
      type: "alert",
      entity_type: "FollowUp",
      entity_id: f.id,
      link: followUpLink(f.client_id),
    });
  });
  today.forEach((f) => {
    drafts.push({
      title: "Follow-up due today",
      body: `${followUpWho(f.lead_id, f.client_id)}${f.follow_up_time ? ` — ${f.follow_up_time}` : ""}`,
      type: "warning",
      entity_type: "FollowUp",
      entity_id: f.id,
      link: followUpLink(f.client_id),
    });
  });

  s.clients.forEach((c) => {
    const { balanceDue } = calculateClientFinancials(c, s.payments);
    if (balanceDue > 0 && (c.project_value || 0) > 0) {
      drafts.push({
        title: "Payment due",
        body: `${formatCurrency(balanceDue, currency)} pending from ${c.name}`,
        type: "warning",
        entity_type: "Client",
        entity_id: c.id,
        link: `/crm/clients/${c.id}`,
      });
    }
  });

  s.invoices
    .filter((i) => i.status === "Overdue")
    .forEach((i) => {
      drafts.push({
        title: "Invoice overdue",
        body: `${i.invoice_number} is overdue`,
        type: "alert",
        entity_type: "Invoice",
        entity_id: i.id,
        link: "/finance/invoices",
      });
    });

  const soon = Date.now() + 3 * 24 * 60 * 60 * 1000;
  s.projects
    .filter((p) => p.status !== "Completed" && new Date(p.deadline).getTime() > Date.now() && new Date(p.deadline).getTime() < soon)
    .forEach((p) => {
      drafts.push({
        title: "Project deadline approaching",
        body: `${p.name} is due ${formatDate(p.deadline)}`,
        type: "warning",
        entity_type: "Project",
        entity_id: p.id,
        link: "/operations/projects",
      });
    });

  s.projects
    .filter((p) => p.status === "At Risk")
    .forEach((p) => {
      drafts.push({ title: "Project at risk", body: `${p.name} needs attention`, type: "alert", entity_type: "Project", entity_id: p.id, link: "/operations/projects" });
    });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  s.tasks
    .filter((t) => t.status !== "Done" && t.due_date && new Date(t.due_date) >= todayStart && new Date(t.due_date) <= todayEnd)
    .forEach((t) => {
      drafts.push({ title: "Task due today", body: t.title, type: "info", entity_type: "Task", entity_id: t.id, link: "/operations/tasks" });
    });

  const existingKeys = new Set(s.notifications.map(notificationKey));
  const seenInBatch = new Set<string>();
  const fresh: AppNotification[] = [];
  for (const d of drafts) {
    const key = notificationKey(d);
    if (existingKeys.has(key) || seenInBatch.has(key)) continue;
    seenInBatch.add(key);
    fresh.push({ ...d, id: newId(), company_id: s.company.id, created_at: nowIso(), updated_at: nowIso(), is_demo: false, read: false });
  }
  return fresh;
}

const PERMISSION_ASKED_KEY = "trinityai-notif-permission-asked";

/** Asks for browser notification permission at most once, ever (spec Section 31). */
export function maybeRequestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return; // already granted, denied, or unsupported — never re-ask
  if (localStorage.getItem(PERMISSION_ASKED_KEY)) return;
  localStorage.setItem(PERMISSION_ASKED_KEY, "1");
  Notification.requestPermission();
}

function sendBrowserNotification(n: AppNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(`TrinityOS: ${n.title}`, { body: n.body });
  } catch {
    // Some browsers (and most mobile webviews) don't support the constructor form — in-app notifications still work regardless.
  }
}

/** Runs generateNotifications() and persists any new ones, firing a browser notification for alerts/warnings when permitted (spec Sections 29-31). */
export function runNotificationSweep() {
  const fresh = generateNotifications();
  if (fresh.length === 0) return;
  useStore.setState((st) => ({ notifications: [...fresh, ...st.notifications].slice(0, 200) }));
  fresh.filter((n) => n.type === "alert" || n.type === "warning").forEach(sendBrowserNotification);
}

/** Fires immediately when a new lead is created — an event, not a standing condition, so it's called directly from the create action rather than the sweep (spec Section 29). */
export function notifyNewLead(lead: Pick<Lead, "id" | "name" | "company_name">) {
  const s = useStore.getState();
  const n: AppNotification = {
    id: newId(),
    company_id: s.company.id,
    created_at: nowIso(),
    updated_at: nowIso(),
    is_demo: false,
    read: false,
    title: "New lead",
    body: `${lead.name} (${lead.company_name})`,
    type: "info",
    entity_type: "Lead",
    entity_id: lead.id,
    link: "/crm/leads",
  };
  useStore.setState((st) => ({ notifications: [n, ...st.notifications].slice(0, 200) }));
  sendBrowserNotification(n);
}
