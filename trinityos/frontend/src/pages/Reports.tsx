import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/FormField";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { exportWorkbook } from "../lib/export";
import { calculateRevenue, calculateConversionRate } from "../lib/calculations";
import { formatCurrency } from "../lib/format";
import { toast } from "../components/ui/Toast";

type Period = "This Month" | "This Quarter" | "This Year";

export default function Reports() {
  const store = useStore();
  const { revenue, projects, leads, company } = store;
  const [period, setPeriod] = useState<Period>("This Month");

  function handleExportAll() {
    exportWorkbook(
      [
        { name: "Leads", rows: store.leads.map((l) => ({ Name: l.name, Company: l.company_name, Status: l.status, Score: l.score })) },
        { name: "Clients", rows: store.clients.map((c) => ({ Name: c.name, Status: c.status, Health: c.health_score })) },
        { name: "Deals", rows: store.deals.map((d) => ({ Title: d.title, Stage: d.stage, Value: d.value })) },
        { name: "Proposals", rows: store.proposals.map((p) => ({ Number: p.proposal_number, Title: p.title, Amount: p.amount, Status: p.status })) },
        { name: "Projects", rows: store.projects.map((p) => ({ Name: p.name, Status: p.status, Progress: p.progress, Deadline: p.deadline })) },
        { name: "Tasks", rows: store.tasks.map((t) => ({ Title: t.title, Status: t.status, Priority: t.priority })) },
        { name: "Revenue", rows: store.revenue.map((r) => ({ Date: r.date, Amount: r.amount, Recurring: r.is_recurring })) },
        { name: "Expenses", rows: store.expenses.map((e) => ({ Date: e.date, Vendor: e.vendor, Category: e.category, Amount: e.amount })) },
        { name: "Invoices", rows: store.invoices.map((i) => ({ Number: i.invoice_number, Amount: i.amount, Paid: i.amount_paid, Status: i.status })) },
        { name: "Ad Campaigns", rows: store.adCampaigns.map((c) => ({ Name: c.name, Channel: c.channel, Spend: c.spend, Revenue: c.revenue_attributed })) },
        { name: "Goals", rows: store.goals.map((g) => ({ Title: g.title, Target: g.target_value, Current: g.current_value, Status: g.status })) },
      ],
      "trinityos-business-data"
    );
    toast.success("Workbook exported");
  }

  const periodStart = (() => {
    const now = new Date();
    if (period === "This Month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "This Quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return new Date(now.getFullYear(), 0, 1);
  })();

  const convertedLeads = leads.filter((l) => l.status === "Converted").length;
  const leadConversionRate = calculateConversionRate(leads.length, convertedLeads);
  const completedProjects = projects.filter((p) => p.status === "Completed").length;
  const projectCompletionRate = projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;
  const totalRevenue = calculateRevenue(revenue, periodStart);

  const summary = [
    { label: "Lead Conversion Rate", value: `${leadConversionRate.toFixed(1)}%`, icon: "trending_up" },
    { label: "Project Completion Rate", value: `${projectCompletionRate}%`, icon: "check_circle" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue, company.currency), icon: "account_balance_wallet" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Business Reports"
        subtitle="Comprehensive overview of operational and financial health."
        right={
          <div className="flex items-center gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-auto py-2 rounded-lg">
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </Select>
            <Button variant="secondary" icon={<Icon name="download" size={18} />} onClick={handleExportAll}>
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        {summary.map((s) => (
          <Card key={s.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">{s.label}</span>
              <Icon name={s.icon} className="text-status-success-text" />
            </div>
            <span className="font-metric-md text-metric-md">{s.value}</span>
          </Card>
        ))}
      </div>

      {/* More Tools — every module from the previous version still works, it just isn't
          in the main rail anymore (spec Section 3: "place it inside the relevant module"). */}
      <Card>
        <h3 className="font-headline-md text-headline-md mb-3">More Tools</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MORE_TOOLS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              <Icon name={t.icon} size={20} className="text-on-surface-variant flex-shrink-0" />
              <span className="font-label-bold text-label-sm text-on-surface truncate">{t.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

const MORE_TOOLS = [
  { label: "Proposals", path: "/crm/proposals", icon: "description" },
  { label: "Services", path: "/operations/services", icon: "design_services" },
  { label: "Team", path: "/operations/team", icon: "badge" },
  { label: "Documents", path: "/documents", icon: "folder" },
  { label: "Marketing Channels", path: "/marketing/channels", icon: "hub" },
  { label: "Meta Ads", path: "/marketing/meta-ads", icon: "ads_click" },
  { label: "Goals", path: "/growth/goals", icon: "flag" },
  { label: "Forecast", path: "/growth/forecast", icon: "insights" },
  { label: "Business Health", path: "/growth/health", icon: "monitor_heart" },
  { label: "AI Advisor", path: "/ai", icon: "smart_toy" },
];
