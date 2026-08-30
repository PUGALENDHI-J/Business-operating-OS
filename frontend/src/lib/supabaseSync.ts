import { supabase, isSupabaseConfigured } from "./supabase";
import { useStore } from "./store";
import { calculateClientFinancials } from "./calculations";

export interface SyncTableResult {
  table: string;
  count: number;
  error?: string;
}

export interface SyncSummary {
  ranAt: string;
  results: SyncTableResult[];
  ok: boolean;
}

/**
 * Record counts per module, shown in Settings > Data Sync before syncing
 * (spec Section 47) so the person can see exactly what's about to go up.
 */
export function getLocalDataCounts() {
  const s = useStore.getState();
  return {
    Leads: s.leads.length,
    Clients: s.clients.length,
    Contacts: s.contacts.length,
    Deals: s.deals.length,
    Proposals: s.proposals.length,
    Services: s.services.length,
    Projects: s.projects.length,
    Tasks: s.tasks.length,
    Invoices: s.invoices.length,
    Payments: s.payments.length,
    Revenue: s.revenue.length,
    Expenses: s.expenses.length,
    "Follow-ups": s.followUps.length,
    Activities: s.activities.length,
    Notifications: s.notifications.length,
    "Ad Campaigns": s.adCampaigns.length,
    Goals: s.goals.length,
    Documents: s.documents.length,
  };
}

/**
 * Converts each Zustand slice into rows matching supabase/schema.sql column
 * names, keyed by the table name that receives them. IDs are the same
 * client-generated UUIDs already used locally, so this upserts on `id` and
 * can be re-run safely without creating duplicates (spec Section 80).
 */
function buildSyncPayload() {
  const s = useStore.getState();
  const companyId = s.company.id;

  return {
    companies: [
      { id: companyId, name: s.company.name, stage: s.company.stage, currency: s.company.currency, updated_at: new Date().toISOString() },
    ],
    leads: s.leads.map((l) => ({
      id: l.id,
      company_id: companyId,
      lead_number: l.lead_number,
      name: l.name,
      company_name: l.company_name,
      email: l.email,
      phone: l.phone,
      whatsapp: l.whatsapp,
      requirement: l.requirement,
      estimated_value: l.estimated_value,
      source: l.source,
      score: l.score,
      status: l.status,
      assigned_to: l.assigned_to || null,
      next_follow_up: l.next_follow_up,
      next_action: l.next_action,
      notes: l.notes,
      converted_client_id: l.converted_client_id || null,
      is_demo: l.is_demo,
      created_at: l.created_at,
      updated_at: l.updated_at,
    })),
    clients: s.clients.map((c) => {
      const fin = calculateClientFinancials(c, s.payments);
      return {
        id: c.id,
        company_id: companyId,
        client_number: c.client_number,
        name: c.name,
        logo_initial: c.logo_initial,
        status: c.status,
        descriptor: c.descriptor,
        location: c.location,
        website: c.website,
        health_score: c.health_score,
        source_lead_id: c.source_lead_id || null,
        contact_person: c.contact_person,
        whatsapp: c.whatsapp,
        phone: c.phone,
        email: c.email,
        requirement: c.requirement,
        project_value: fin.projectValue,
        advance_paid: c.advance_paid,
        total_paid: fin.totalPaid,
        next_action: c.next_action,
        is_demo: c.is_demo,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    }),
    contacts: s.contacts.map((c) => ({
      id: c.id,
      company_id: companyId,
      client_id: c.client_id,
      name: c.name,
      role: c.role,
      email: c.email,
      phone: c.phone,
      is_primary: c.is_primary,
      is_demo: c.is_demo,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
    deals: s.deals.map((d) => ({
      id: d.id,
      company_id: companyId,
      title: d.title,
      client_id: d.client_id || null,
      lead_id: d.lead_id || null,
      value: d.value,
      probability: d.probability,
      stage: d.stage,
      owner_id: d.owner_id || null,
      expected_close: d.expected_close || null,
      converted_project_id: d.converted_project_id || null,
      is_demo: d.is_demo,
      created_at: d.created_at,
      updated_at: d.updated_at,
    })),
    proposals: s.proposals.map((p) => ({
      id: p.id,
      company_id: companyId,
      proposal_number: p.proposal_number,
      client_id: p.client_id || null,
      deal_id: p.deal_id || null,
      title: p.title,
      amount: p.amount,
      status: p.status,
      issue_date: p.issue_date,
      valid_until: p.valid_until,
      is_demo: p.is_demo,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
    services: s.services.map((sv) => ({
      id: sv.id,
      company_id: companyId,
      name: sv.name,
      category: sv.category,
      default_price: sv.default_price,
      billing_type: sv.billing_type,
      is_demo: sv.is_demo,
      created_at: sv.created_at,
      updated_at: sv.updated_at,
    })),
    projects: s.projects.map((p) => ({
      id: p.id,
      company_id: companyId,
      client_id: p.client_id,
      deal_id: p.deal_id || null,
      name: p.name,
      requirement: p.requirements,
      project_value: p.budget,
      advance_paid: p.advance_paid,
      total_paid: p.total_paid,
      start_date: null,
      deadline: p.deadline,
      progress: p.progress,
      status: p.status,
      next_action: p.next_action,
      is_demo: p.is_demo,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
    tasks: s.tasks.map((t) => ({
      id: t.id,
      company_id: companyId,
      title: t.title,
      project_id: t.project_id || null,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assignee_id || null,
      due_date: t.due_date || null,
      comments_count: t.comments_count,
      attachments_count: t.attachments_count,
      is_demo: t.is_demo,
      created_at: t.created_at,
      updated_at: t.updated_at,
    })),
    invoices: s.invoices.map((i) => ({
      id: i.id,
      company_id: companyId,
      invoice_number: i.invoice_number,
      client_id: i.client_id,
      issue_date: i.issue_date,
      due_date: i.due_date,
      amount: i.amount,
      amount_paid: i.amount_paid,
      status: i.status,
      project_id: i.project_id || null,
      is_demo: i.is_demo,
      created_at: i.created_at,
      updated_at: i.updated_at,
    })),
    payments: s.payments.map((p) => ({
      id: p.id,
      company_id: companyId,
      client_id: p.client_id || null,
      project_id: p.project_id || null,
      invoice_id: p.invoice_id || null,
      amount: p.amount,
      payment_date: p.date,
      payment_method: p.method,
      reference: p.reference,
      notes: p.notes,
      is_demo: p.is_demo,
      created_at: p.created_at,
    })),
    revenue: s.revenue.map((r) => ({
      id: r.id,
      company_id: companyId,
      date: r.date,
      client_id: r.client_id || null,
      service: r.service,
      amount: r.amount,
      is_recurring: r.is_recurring,
      invoice_id: r.invoice_id || null,
      is_demo: r.is_demo,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    expenses: s.expenses.map((e) => ({
      id: e.id,
      company_id: companyId,
      date: e.date,
      category: e.category,
      vendor: e.vendor,
      amount: e.amount,
      notes: e.notes,
      is_demo: e.is_demo,
      created_at: e.created_at,
      updated_at: e.updated_at,
    })),
    follow_ups: s.followUps.map((f) => ({
      id: f.id,
      company_id: companyId,
      lead_id: f.lead_id || null,
      client_id: f.client_id || null,
      project_id: f.project_id || null,
      follow_up_date: f.follow_up_date,
      follow_up_time: f.follow_up_time || null,
      reason: f.reason,
      next_action: f.next_action,
      status: f.status,
      outcome: f.outcome || null,
      completed_at: f.completed_at || null,
      is_demo: f.is_demo,
      created_at: f.created_at,
      updated_at: f.updated_at,
    })),
    activities: s.activities.map((a) => ({
      id: a.id,
      company_id: companyId,
      user_id: a.actor_id || null,
      lead_id: a.entity_type === "Lead" ? a.entity_id : null,
      client_id: a.entity_type === "Client" ? a.entity_id : null,
      project_id: a.entity_type === "Project" ? a.entity_id : null,
      activity_type: a.entity_type,
      title: a.summary,
      description: a.summary,
      is_demo: a.is_demo,
      created_at: a.created_at,
    })),
    notifications: s.notifications.map((n) => ({
      id: n.id,
      company_id: companyId,
      type: n.type,
      title: n.title,
      body: n.body,
      entity_type: n.entity_type || null,
      entity_id: n.entity_id || null,
      read: n.read,
      is_demo: n.is_demo,
      created_at: n.created_at,
    })),
    ad_campaigns: s.adCampaigns.map((c) => ({
      id: c.id,
      company_id: companyId,
      channel: c.channel,
      name: c.name,
      spend: c.spend,
      leads_generated: c.leads_generated,
      clients_generated: c.clients_generated,
      revenue_attributed: c.revenue_attributed,
      status: c.status,
      is_demo: c.is_demo,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
    goals: s.goals.map((g) => ({
      id: g.id,
      company_id: companyId,
      title: g.title,
      metric: g.metric,
      target_value: g.target_value,
      current_value: g.current_value,
      start_date: g.start_date,
      end_date: g.end_date,
      status: g.status,
      is_demo: g.is_demo,
      created_at: g.created_at,
      updated_at: g.updated_at,
    })),
    documents: s.documents.map((d) => ({
      id: d.id,
      company_id: companyId,
      name: d.name,
      category: d.category,
      linked_type: d.linked_type || null,
      linked_id: d.linked_id || null,
      size_kb: d.size_kb,
      is_demo: d.is_demo,
      created_at: d.created_at,
      updated_at: d.updated_at,
    })),
  };
}

/**
 * Pushes every local record to Supabase, table by table, upserting on `id`
 * so re-running this never creates duplicates (spec Sections 47, 80). Each
 * table's success/failure is reported individually and honestly — a failure
 * on one table never gets rolled into a blanket "success" toast (spec
 * Section 49, 81).
 *
 * IMPORTANT — not yet verified against a live project: this requires (a) a
 * configured Supabase project (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * with supabase/schema.sql applied, and (b) an authenticated Supabase Auth
 * session with a matching `profiles` row, since the schema's Row Level
 * Security policies key off `auth.uid()`. This codebase does not yet include
 * a sign-in screen — without one, every write below will fail RLS with a
 * clear permission-denied error rather than silently pretending to succeed.
 */
export async function syncAllToSupabase(): Promise<SyncSummary> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ranAt: new Date().toISOString(),
      ok: false,
      results: [{ table: "supabase", count: 0, error: "Supabase isn't connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync." }],
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return {
      ranAt: new Date().toISOString(),
      ok: false,
      results: [{ table: "supabase", count: 0, error: "Not signed in. Sign in with your Supabase account first — Row Level Security requires it." }],
    };
  }

  const payload = buildSyncPayload();
  const results: SyncTableResult[] = [];

  for (const [table, rows] of Object.entries(payload)) {
    if (rows.length === 0) {
      results.push({ table, count: 0 });
      continue;
    }
    const { error } = await supabase.from(table).upsert(rows as unknown as Record<string, unknown>[], { onConflict: "id" });
    results.push({ table, count: rows.length, error: error?.message });
  }

  return { ranAt: new Date().toISOString(), results, ok: results.every((r) => !r.error) };
}
