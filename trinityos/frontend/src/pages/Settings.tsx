import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Field, Select, TextInput } from "../components/ui/FormField";
import { useStore } from "../lib/store";
import { toast } from "../components/ui/Toast";
import { parseSpreadsheetFile, exportWorkbook, exportAllToCsvZip, businessFilename } from "../lib/export";
import { calculateClientFinancials, calculateRevenue, calculateExpenses, calculateNetProfit, getActiveFollowUps } from "../lib/calculations";
import { formatDate } from "../lib/format";
import { isSupabaseConfigured } from "../lib/supabase";
import { getLocalDataCounts, syncAllToSupabase, type SyncSummary } from "../lib/supabaseSync";
import { useAuthStore } from "../lib/authStore";
import { signIn, signUp, signOut } from "../lib/supabaseAuth";
import { newId, nowIso } from "../lib/id";
import { useThemeStore, type ThemePref } from "../lib/themeStore";
import type { Lead, Role } from "../types";

const ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "SALES", "EMPLOYEE", "FINANCE"];
const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "light_mode" },
  { value: "dark", label: "Dark", icon: "dark_mode" },
  { value: "system", label: "System", icon: "brightness_auto" },
];

export default function Settings() {
  const {
    company,
    currentUser,
    setRole,
    loadDemoData,
    resetDemoData,
    resetAllData,
    hasDemoData,
    addEntity,
    leads,
    clients,
    projects,
    payments,
    invoices,
    expenses,
    tasks,
    followUps,
    proposals,
    activities,
    revenue,
  } = useStore();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [importStep, setImportStep] = useState<"idle" | "preview">("idle");
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null);
  const session = useAuthStore((s) => s.session);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  async function handleAuthSubmit() {
    if (!authEmail || !authPassword) {
      toast.error("Enter an email and password");
      return;
    }
    setAuthBusy(true);
    const result = authMode === "signin" ? await signIn(authEmail, authPassword) : await signUp(authEmail, authPassword);
    setAuthBusy(false);
    if (result.ok) {
      toast.success(result.message);
      setAuthPassword("");
    } else {
      toast.error(result.message);
    }
  }

  async function handleSignOut() {
    await signOut();
    toast.info("Signed out");
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncAllToSupabase();
      setSyncResult(result);
      if (result.ok) toast.success("Your existing data has been synced to Supabase.");
      else toast.error("Sync finished with errors — see details below.");
    } catch (err) {
      setSyncResult({ ranAt: new Date().toISOString(), ok: false, results: [{ table: "sync", count: 0, error: err instanceof Error ? err.message : "Unknown error" }] });
      toast.error("Unable to connect. Please check your internet connection.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleFile(file: File) {
    try {
      const { headers, rows } = await parseSpreadsheetFile(file);
      setImportHeaders(headers);
      setImportRows(rows);
      const guess: Record<string, string> = {};
      ["name", "company_name", "email", "phone"].forEach((field) => {
        const match = headers.find((h) => h.toLowerCase().includes(field.split("_")[0]));
        if (match) guess[field] = match;
      });
      setMapping(guess);
      setImportStep("preview");
    } catch {
      toast.error("Couldn't read that file — try a CSV or XLSX export");
    }
  }

  function handleImportConfirm() {
    if (!mapping.name) {
      toast.error("Map at least the Name column to continue");
      return;
    }
    let imported = 0;
    for (const row of importRows) {
      const name = row[mapping.name];
      if (!name) continue;
      const lead: Lead = {
        id: newId(),
        company_id: company.id,
        name,
        company_name: mapping.company_name ? row[mapping.company_name] : "",
        email: mapping.email ? row[mapping.email] : "",
        phone: mapping.phone ? row[mapping.phone] : "",
        source: "Other",
        score: 50,
        status: "New",
        created_at: nowIso(),
        updated_at: nowIso(),
        is_demo: false,
      };
      addEntity("leads", lead);
      imported++;
    }
    toast.success(`Imported ${imported} lead${imported === 1 ? "" : "s"}`);
    setImportStep("idle");
    setImportRows([]);
  }

  function buildBusinessDataSheets() {
    const leadsSheet = leads.map((l) => ({
      "Lead ID": l.lead_number,
      Name: l.name,
      Business: l.company_name,
      WhatsApp: l.whatsapp,
      Phone: l.phone,
      Email: l.email,
      Requirement: l.requirement,
      "Est. Value": l.estimated_value ?? 0,
      Status: l.status,
      "Next Action": l.next_action,
      "Next Follow-up": formatDate(l.next_follow_up),
    }));
    const clientsSheet = clients.map((c) => {
      const f = calculateClientFinancials(c, payments);
      return {
        "Client ID": c.client_number,
        Name: c.name,
        "Contact Person": c.contact_person,
        WhatsApp: c.whatsapp,
        Phone: c.phone,
        Email: c.email,
        Requirement: c.requirement,
        "Project Value": f.projectValue,
        "Total Paid": f.totalPaid,
        "Balance Due": f.balanceDue,
        "Paid %": f.paidPercentage,
        Status: c.status,
        "Next Action": c.next_action,
      };
    });
    const projectsSheet = projects.map((p) => ({
      Name: p.name,
      Client: clients.find((c) => c.id === p.client_id)?.name,
      Requirement: p.requirements,
      Budget: p.budget,
      Progress: p.progress,
      Status: p.status,
      Deadline: formatDate(p.deadline),
      "Next Action": p.next_action,
    }));
    const paymentsSheet = payments.map((p) => ({
      Client: clients.find((c) => c.id === p.client_id)?.name,
      Amount: p.amount,
      Date: formatDate(p.date),
      Method: p.method,
      Reference: p.reference,
      Notes: p.notes,
    }));
    const invoicesSheet = invoices.map((i) => ({
      "Invoice #": i.invoice_number,
      Client: clients.find((c) => c.id === i.client_id)?.name,
      Amount: i.amount,
      Paid: i.amount_paid,
      Status: i.status,
      "Due Date": formatDate(i.due_date),
    }));
    const expensesSheet = expenses.map((e) => ({ Date: formatDate(e.date), Category: e.category, Vendor: e.vendor, Amount: e.amount, Notes: e.notes }));
    const tasksSheet = tasks.map((t) => ({ Title: t.title, Status: t.status, Priority: t.priority, "Due Date": formatDate(t.due_date) }));
    const followUpsSheet = followUps.map((f) => ({
      Customer: clients.find((c) => c.id === f.client_id)?.name || leads.find((l) => l.id === f.lead_id)?.name,
      Date: formatDate(f.follow_up_date),
      Time: f.follow_up_time,
      Reason: f.reason,
      Status: f.status,
      Outcome: f.outcome,
      "Next Action": f.next_action,
    }));
    const proposalsSheet = proposals.map((p) => ({ "Proposal #": p.proposal_number, Client: clients.find((c) => c.id === p.client_id)?.name, Amount: p.amount, Status: p.status }));
    const activitiesSheet = activities.map((a) => ({ Date: formatDate(a.created_at), Type: a.entity_type, Summary: a.summary }));

    const totalProjectValue = clients.reduce((s, c) => s + (c.project_value || 0), 0);
    const totalCollected = clients.reduce((s, c) => s + calculateClientFinancials(c, payments).totalPaid, 0);
    const activeFollowUps = getActiveFollowUps(followUps);
    const summarySheet = [
      { Metric: "Total Leads", Value: leads.length },
      { Metric: "Total Clients", Value: clients.length },
      { Metric: "Active Projects", Value: projects.filter((p) => p.status !== "Completed").length },
      { Metric: "Total Project Value", Value: totalProjectValue },
      { Metric: "Total Collected", Value: totalCollected },
      { Metric: "Total Outstanding", Value: Math.max(0, totalProjectValue - totalCollected) },
      { Metric: "Revenue (This Month)", Value: calculateRevenue(revenue) },
      { Metric: "Expenses (This Month)", Value: calculateExpenses(expenses) },
      { Metric: "Net Profit (This Month)", Value: calculateNetProfit(revenue, expenses) },
      { Metric: "Follow-ups Today", Value: activeFollowUps.today.length },
      { Metric: "Overdue Follow-ups", Value: activeFollowUps.overdue.length },
      { Metric: "Overdue Invoices", Value: invoices.filter((i) => i.status === "Overdue").length },
    ];

    return [
      { name: "Leads", rows: leadsSheet },
      { name: "Clients", rows: clientsSheet },
      { name: "Projects", rows: projectsSheet },
      { name: "Payments", rows: paymentsSheet },
      { name: "Invoices", rows: invoicesSheet },
      { name: "Expenses", rows: expensesSheet },
      { name: "Tasks", rows: tasksSheet },
      { name: "Follow-ups", rows: followUpsSheet },
      { name: "Proposals", rows: proposalsSheet },
      { name: "Activities", rows: activitiesSheet },
      { name: "Summary", rows: summarySheet },
    ];
  }

  async function handleExportAllExcel() {
    exportWorkbook(buildBusinessDataSheets(), businessFilename("Business_Data"));
    toast.success("Data exported successfully");
  }

  async function handleExportAllCsv() {
    await exportAllToCsvZip(buildBusinessDataSheets(), businessFilename("Business_Data"));
    toast.success("Data exported successfully");
  }

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Workspace, roles, and data management." />

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Appearance</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          Choose how TrinityAI looks on this device. System follows your OS setting automatically.
        </p>
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-colors ${
                theme === opt.value
                  ? "border-secondary-container bg-secondary-fixed/20 text-on-surface"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon name={opt.icon} size={24} />
              <span className="font-label-bold text-label-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-4">Company Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Field label="Company Name">
            <TextInput defaultValue={company.name} />
          </Field>
          <Field label="Business Stage">
            <Select defaultValue={company.stage}>
              <option>Founder</option>
              <option>Freelancer</option>
              <option>Agency</option>
              <option>Team</option>
              <option>Company</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Select defaultValue={company.currency}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Your Role</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          Switch roles to see how permissions change across the OS. Roles are enforced in the UI here; the backend scaffold enforces the same roles at the API and query layer (see backend/README.md).
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                toast.info(`Switched to ${r}`);
              }}
              className={`px-4 py-2 rounded-full text-label-bold font-label-bold border transition-colors ${
                currentUser.role === r ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Import Leads</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">Upload a CSV or Excel file, map the columns, then confirm the import.</p>
        {importStep === "idle" ? (
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-full cursor-pointer hover:bg-surface-container-low text-label-bold font-label-bold">
            <Icon name="upload_file" size={18} />
            Choose File
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        ) : (
          <div className="space-y-4">
            <p className="text-body-sm font-body-sm text-on-surface-variant">{importRows.length} rows found. Map columns:</p>
            <div className="grid grid-cols-2 gap-3 max-w-xl">
              {["name", "company_name", "email", "phone"].map((field) => (
                <Field key={field} label={field.replace("_", " ")}>
                  <Select value={mapping[field] ?? ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
                    <option value="">Skip</option>
                    {importHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setImportStep("idle")}>Cancel</Button>
              <Button variant="primary" onClick={handleImportConfirm}>Import {importRows.length} Leads</Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Data Sync</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          {isSupabaseConfigured
            ? "Push everything currently in this browser up to your connected Supabase project. Safe to re-run — records are matched by ID, so nothing is duplicated."
            : "Supabase isn't connected in this environment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local (see .env.example) to enable cloud sync."}
        </p>

        {isSupabaseConfigured && (
          <div className="mb-4 pb-4 border-b border-outline-variant/60">
            {session ? (
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-body-sm text-on-surface">
                  Signed in as <span className="font-semibold">{session.user.email}</span>
                </p>
                <Button variant="secondary" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="max-w-sm space-y-3">
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  Sign in with a Supabase Auth account to sync — required because Row Level Security scopes every table to your account.
                </p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setAuthMode("signin")} className={`px-2.5 py-1 rounded-full ${authMode === "signin" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}>
                    Sign in
                  </button>
                  <button onClick={() => setAuthMode("signup")} className={`px-2.5 py-1 rounded-full ${authMode === "signup" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}>
                    Create account
                  </button>
                </div>
                <Field label="Email">
                  <TextInput type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@company.com" />
                </Field>
                <Field label="Password">
                  <TextInput type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Button variant="primary" onClick={handleAuthSubmit} disabled={authBusy}>
                  {authBusy ? "Please wait…" : authMode === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {Object.entries(getLocalDataCounts()).map(([label, count]) => (
            <div key={label} className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low">
              <div className="text-xl font-extrabold text-on-surface">{count}</div>
              <div className="text-xs text-on-surface-variant">{label}</div>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={handleSync} disabled={!isSupabaseConfigured || !session || syncing}>
          {syncing ? "Syncing…" : "Sync to Supabase"}
        </Button>
        {isSupabaseConfigured && !session && <p className="text-xs text-on-surface-variant mt-2">Sign in above to enable sync.</p>}
        {syncResult && (
          <div className="mt-4 space-y-1 text-xs">
            {syncResult.results.map((r) => (
              <div key={r.table} className={`flex items-center justify-between px-2 py-1 rounded ${r.error ? "bg-error-container/40 text-on-error-container" : "text-on-surface-variant"}`}>
                <span>{r.table}</span>
                <span>{r.error ? r.error : `${r.count} synced`}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Data Backup</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          Download a complete copy of your TrinityOS business data — every module, plus a summary sheet.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={<Icon name="download" size={18} />} onClick={handleExportAllExcel}>
            Export All to Excel
          </Button>
          <Button variant="secondary" icon={<Icon name="download" size={18} />} onClick={handleExportAllCsv}>
            Export All to CSV
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-headline-md text-headline-md mb-2">Demo Data</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          Demo records are flagged and kept separate from real data. Reset removes only demo records — nothing you've entered yourself.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={loadDemoData} disabled={hasDemoData}>
            {hasDemoData ? "Demo Data Loaded" : "Load Demo Data"}
          </Button>
          <Button variant="secondary" onClick={resetDemoData} disabled={!hasDemoData}>
            Reset Demo Data
          </Button>
        </div>
      </Card>

      <Card className="border-error/40">
        <h3 className="font-headline-md text-headline-md mb-2 text-error">Danger Zone</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">This clears every record in this browser, including anything you've entered yourself.</p>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("This will permanently clear all local data. Continue?")) {
              resetAllData();
              toast.info("Workspace reset");
            }
          }}
        >
          Reset Entire Workspace
        </Button>
      </Card>
    </AppShell>
  );
}
