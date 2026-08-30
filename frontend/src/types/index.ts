// ---------------------------------------------------------------------------
// TrinityAI Business OS — core data model
// Mirrors the entities listed in the build spec, Section 4 "Core data model".
// Every record carries company_id scoping + audit + soft-delete fields, and
// an is_demo flag so seeded demo data is never mixed silently into real
// records (spec Section 4, "Cross-cutting").
// ---------------------------------------------------------------------------

export type Role = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "EMPLOYEE" | "FINANCE";

export interface AuditFields {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_demo: boolean;
}

export interface Company extends AuditFields {
  name: string;
  stage: "Founder" | "Freelancer" | "Agency" | "Team" | "Company";
  currency: string; // e.g. "INR"
}

export interface User extends AuditFields {
  name: string;
  email: string;
  role: Role;
  avatar_initials: string;
  avatar_color: string;
}

export type TeamMember = User;

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Unqualified"
  | "Follow-up"
  | "Negotiation"
  | "Hot"
  | "Won"
  | "Lost"
  | "Converted";
export type LeadSource = "Website" | "Referral" | "Cold Outreach" | "Social" | "Ads" | "Event" | "Other";

export interface Lead extends AuditFields {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  source: LeadSource;
  score: number; // 0-100
  status: LeadStatus;
  assigned_to?: string; // user id
  next_follow_up?: string | null;
  notes?: string;
  converted_client_id?: string | null;
  // --- CRM workflow upgrade (optional — safe on old persisted records) ---
  lead_number?: string; // human-readable id, e.g. LEAD-0001
  whatsapp?: string;
  requirement?: string;
  estimated_value?: number;
  website?: string;
  location?: string;
  next_action?: string;
}

export interface Contact extends AuditFields {
  client_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

export type ClientStatus =
  | "Active"
  | "Inactive"
  | "At Risk"
  | "Advance Received"
  | "Project Started"
  | "In Progress"
  | "Payment Due"
  | "Completed";

export interface Client extends AuditFields {
  name: string;
  logo_initial: string;
  status: ClientStatus;
  descriptor: string;
  location: string;
  website: string;
  health_score: number; // 0-100
  source_lead_id?: string | null;
  // --- CRM workflow upgrade (optional — safe on old persisted records) ---
  client_number?: string; // human-readable id, e.g. CLI-0001
  contact_person?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  requirement?: string;
  project_value?: number;
  advance_paid?: number;
  total_paid?: number;
  next_action?: string;
}

export const DEAL_STAGES = [
  "New",
  "Qualified",
  "Meeting",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export interface Deal extends AuditFields {
  title: string;
  client_id?: string | null;
  lead_id?: string | null;
  value: number;
  probability: number; // 0-100, drives weighted pipeline
  stage: DealStage;
  owner_id?: string;
  expected_close?: string;
  converted_project_id?: string | null;
}

export type ProposalStatus = "Draft" | "Sent" | "Accepted" | "Rejected";

export interface Proposal extends AuditFields {
  proposal_number: string;
  client_id?: string | null;
  deal_id?: string | null;
  title: string;
  amount: number;
  status: ProposalStatus;
  issue_date: string;
  valid_until: string;
}

export interface Service extends AuditFields {
  name: string;
  category: string;
  default_price: number;
  billing_type: "One-time" | "Recurring";
}

export type ProjectStatus = "Planning" | "In Progress" | "At Risk" | "Completed" | "On Hold";

export interface Project extends AuditFields {
  name: string;
  client_id: string;
  status: ProjectStatus;
  progress: number; // 0-100
  deadline: string;
  owner_id?: string;
  budget: number;
  deal_id?: string | null;
  // --- CRM workflow upgrade (optional — safe on old persisted records) ---
  advance_paid?: number;
  total_paid?: number;
  requirements?: string;
  next_action?: string;
}

export type TaskStatus = "To Do" | "In Progress" | "Review" | "Done";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task extends AuditFields {
  title: string;
  project_id?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  comments_count: number;
  attachments_count: number;
}

export interface TaskComment extends AuditFields {
  task_id: string;
  author_id: string;
  body: string;
}

export interface RevenueEntry extends AuditFields {
  date: string;
  client_id?: string | null;
  service?: string;
  amount: number;
  is_recurring: boolean;
  invoice_id?: string | null;
}

export type ExpenseCategory = "Software" | "Payroll" | "Marketing" | "Contractors" | "Office" | "Other";

export interface Expense extends AuditFields {
  date: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  notes?: string;
}

export type InvoiceStatus = "Draft" | "Unpaid" | "Paid" | "Overdue";

export interface Invoice extends AuditFields {
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  status: InvoiceStatus;
  project_id?: string | null;
}

export interface Payment extends AuditFields {
  // A payment is always against a client/project's running balance. It may
  // additionally be linked to a specific invoice when one exists, but an
  // invoice is no longer required to record money received (spec Section 18).
  invoice_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  amount: number;
  date: string;
  method: "Bank Transfer" | "Card" | "UPI" | "Cash" | "Other";
  reference?: string;
  notes?: string;
}

export type FollowUpStatus = "Scheduled" | "Completed";
export type FollowUpOutcome =
  | "No Answer"
  | "Interested"
  | "Call Back Later"
  | "Proposal Requested"
  | "Confirmed"
  | "Not Interested"
  | "Other";

/**
 * First-class follow-up record (spec Sections 25-28). A lead/client/project
 * can carry any number of these over time, each with its own reason,
 * outcome, and resulting next action — distinct from the single
 * `next_follow_up` convenience date still kept on Lead for list/table views.
 */
export interface FollowUp extends AuditFields {
  lead_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  follow_up_date: string; // ISO date
  follow_up_time?: string; // "HH:MM"
  reason?: string;
  next_action?: string;
  status: FollowUpStatus;
  outcome?: FollowUpOutcome | null;
  completed_at?: string | null;
}

export type MarketingChannel = "Meta Ads" | "Google Ads" | "SEO" | "Referral" | "Email" | "Organic Social";

export interface AdCampaign extends AuditFields {
  channel: MarketingChannel;
  name: string;
  spend: number;
  leads_generated: number;
  clients_generated: number;
  revenue_attributed: number;
  status: "Active" | "Paused" | "Ended";
}

export type GoalStatus = "Ahead" | "On Track" | "At Risk" | "Behind";

export interface Goal extends AuditFields {
  title: string;
  metric: "Revenue" | "New Clients" | "MRR" | "Net Profit";
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  status: GoalStatus;
}

export interface GoalProgress extends AuditFields {
  goal_id: string;
  period_label: string; // e.g. "2026-W34"
  target: number;
  actual: number;
}

export type DocumentCategory = "Contract" | "Proposal" | "Invoice" | "Brand Asset" | "Report" | "Other";

export interface Doc extends AuditFields {
  name: string;
  category: DocumentCategory;
  linked_type?: "Client" | "Project" | "Deal" | null;
  linked_id?: string | null;
  size_kb: number;
}

export type NotificationType = "info" | "warning" | "success" | "alert";

export interface AppNotification extends AuditFields {
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  // Used to dedupe and to route action buttons (spec Section 44) — optional
  // so older persisted notifications without them still type-check.
  entity_type?: string;
  entity_id?: string;
}

export type ActivityEntity = "Lead" | "Client" | "Deal" | "Project" | "Task" | "Invoice" | "Payment" | "Proposal";

export interface Activity extends AuditFields {
  entity_type: ActivityEntity;
  entity_id: string;
  actor_id?: string;
  summary: string;
}

export interface AuditLog extends AuditFields {
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  meta?: Record<string, unknown>;
}

export type InsightSeverity = "info" | "warning" | "critical";

export interface AiInsight extends AuditFields {
  title: string;
  body: string;
  severity: InsightSeverity;
  source: "daily_briefing" | "weekly_review" | "alert" | "upsell";
  entity_type?: ActivityEntity;
  entity_id?: string;
  dismissed: boolean;
}

export interface Settings {
  company_name: string;
  currency: string;
  fiscal_year_start_month: number;
  business_stage: Company["stage"];
}
