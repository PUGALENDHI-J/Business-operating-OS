-- =============================================================================
-- TrinityOS — Supabase schema (spec Sections 36-46)
-- =============================================================================
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db
-- push` with this file in supabase/migrations). It has NOT been run against a
-- live project as part of this change — review it yourself before applying,
-- particularly the RLS policies, before trusting it with real data.
--
-- Design notes:
--   * Every business table is scoped by company_id and RLS restricts access
--     to rows whose company_id matches the caller's profile (spec Section 46).
--   * IDs are client-generated UUIDs (the frontend already generates them via
--     uuid v4 in lib/id.ts) so upserts on `id` are safe and idempotent — the
--     sync layer in lib/supabaseSync.ts relies on this to avoid duplicates
--     (spec Section 80).
--   * Money columns are NUMERIC, not FLOAT, to avoid rounding drift.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Companies & profiles
-- ---------------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null default 'Founder',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'OWNER',
  avatar_initials text,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  lead_number text,
  name text not null,
  company_name text,
  email text,
  phone text,
  whatsapp text,
  requirement text,
  estimated_value numeric,
  source text,
  score integer,
  status text not null default 'New',
  assigned_to uuid,
  next_follow_up timestamptz,
  next_action text,
  notes text,
  converted_client_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_company_lead_number_key on leads (company_id, lead_number);

create table if not exists clients (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  client_number text,
  name text not null,
  logo_initial text,
  status text not null default 'Active',
  descriptor text,
  location text,
  website text,
  health_score integer,
  source_lead_id uuid references leads (id) on delete set null,
  contact_person text,
  whatsapp text,
  phone text,
  email text,
  requirement text,
  project_value numeric,
  advance_paid numeric,
  total_paid numeric,
  next_action text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clients_company_client_number_key on clients (company_id, client_number);

create table if not exists contacts (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  client_id uuid references clients (id) on delete set null,
  lead_id uuid references leads (id) on delete set null,
  value numeric not null default 0,
  probability integer not null default 0,
  stage text not null default 'New',
  owner_id uuid,
  expected_close timestamptz,
  converted_project_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposals (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  proposal_number text,
  client_id uuid references clients (id) on delete set null,
  deal_id uuid references deals (id) on delete set null,
  title text not null,
  amount numeric not null default 0,
  status text not null default 'Draft',
  issue_date date,
  valid_until date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
create table if not exists services (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  category text,
  default_price numeric,
  billing_type text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  deal_id uuid references deals (id) on delete set null,
  project_number text,
  name text not null,
  requirement text,
  project_value numeric,
  advance_paid numeric,
  total_paid numeric,
  balance_due numeric,
  payment_percentage numeric,
  start_date date,
  deadline date,
  progress integer not null default 0,
  status text not null default 'Planning',
  next_action text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_members (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  project_id uuid references projects (id) on delete cascade,
  status text not null default 'To Do',
  priority text not null default 'MEDIUM',
  assignee_id uuid,
  due_date timestamptz,
  comments_count integer not null default 0,
  attachments_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  author_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  invoice_number text,
  client_id uuid not null references clients (id) on delete cascade,
  issue_date date,
  due_date date,
  amount numeric not null default 0,
  amount_paid numeric not null default 0,
  status text not null default 'Draft',
  project_id uuid references projects (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  invoice_id uuid references invoices (id) on delete set null,
  amount numeric not null,
  payment_date date not null default current_date,
  payment_method text,
  reference text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists revenue (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  date date not null default current_date,
  client_id uuid references clients (id) on delete set null,
  service text,
  amount numeric not null,
  is_recurring boolean not null default false,
  invoice_id uuid references invoices (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  date date not null default current_date,
  category text,
  vendor text,
  amount numeric not null,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Follow-ups, activity, notifications, marketing, goals, docs, audit
-- ---------------------------------------------------------------------------
create table if not exists follow_ups (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  follow_up_date date not null,
  follow_up_time time,
  reason text,
  next_action text,
  status text not null default 'Scheduled',
  outcome text,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid,
  lead_id uuid references leads (id) on delete set null,
  client_id uuid references clients (id) on delete set null,
  project_id uuid references projects (id) on delete set null,
  activity_type text,
  title text,
  description text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read boolean not null default false,
  scheduled_for timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ad_campaigns (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  channel text,
  name text not null,
  spend numeric not null default 0,
  leads_generated integer not null default 0,
  clients_generated integer not null default 0,
  revenue_attributed numeric not null default 0,
  status text not null default 'Active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  metric text,
  target_value numeric,
  current_value numeric,
  start_date date,
  end_date date,
  status text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goal_progress (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  goal_id uuid not null references goals (id) on delete cascade,
  period_label text,
  target numeric,
  actual numeric,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  category text,
  linked_type text,
  linked_id uuid,
  size_kb numeric,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  company_id uuid primary key references companies (id) on delete cascade,
  company_name text,
  currency text,
  fiscal_year_start_month integer,
  business_stage text,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key,
  company_id uuid not null references companies (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security (spec Section 46) — every business table is scoped to
-- the caller's own company via their `profiles` row.
-- =============================================================================
create or replace function current_company_id() returns uuid
language sql stable
as $$
  select company_id from profiles where id = auth.uid()
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'leads','clients','contacts','deals','proposals','services','projects',
      'project_members','tasks','task_comments','invoices','payments','revenue',
      'expenses','follow_ups','activities','notifications','ad_campaigns','goals',
      'goal_progress','documents','settings','audit_logs'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (company_id = current_company_id()) with check (company_id = current_company_id())',
      t || '_company_scoped', t
    );
  end loop;
end $$;

alter table companies enable row level security;
create policy companies_self on companies for select using (id = current_company_id());

alter table profiles enable row level security;
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
