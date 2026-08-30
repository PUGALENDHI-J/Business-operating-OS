import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { exportWorkbook } from "../lib/export";
import {
  calculateRevenue,
  calculateNetProfit,
  calculatePipelineValue,
  calculateWinRate,
  calculateOutstandingReceivables,
  calculateOverdueProjectsCount,
} from "../lib/calculations";
import { formatCurrency } from "../lib/format";
import { toast } from "../components/ui/Toast";

export default function Reports() {
  const store = useStore();
  const { revenue, expenses, deals, invoices, projects, leads, clients, company } = store;

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
      "trinityai-business-os-export"
    );
    toast.success("Workbook exported");
  }

  const summary = [
    { label: "Revenue (this month)", value: formatCurrency(calculateRevenue(revenue), company.currency), icon: "payments" },
    { label: "Net Profit (this month)", value: formatCurrency(calculateNetProfit(revenue, expenses), company.currency), icon: "trending_up" },
    { label: "Open Pipeline", value: formatCurrency(calculatePipelineValue(deals), company.currency), icon: "view_kanban" },
    { label: "Win Rate", value: `${Math.round(calculateWinRate(deals))}%`, icon: "emoji_events" },
    { label: "Outstanding Receivables", value: formatCurrency(calculateOutstandingReceivables(invoices), company.currency), icon: "receipt_long" },
    { label: "Projects at Risk", value: calculateOverdueProjectsCount(projects), icon: "warning" },
    { label: "Total Leads", value: leads.length, icon: "group_add" },
    { label: "Total Clients", value: clients.length, icon: "domain" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="A live snapshot across every module."
        right={
          <Button variant="primary" icon={<Icon name="download" size={18} />} onClick={handleExportAll}>
            Export Everything
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        {summary.map((s) => (
          <Card key={s.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">{s.label}</span>
              <Icon name={s.icon} className="text-outline" />
            </div>
            <span className="font-metric-md text-metric-md">{s.value}</span>
          </Card>
        ))}
      </div>

      <Card className="flex items-center gap-3 bg-surface-container-low border-dashed">
        <Icon name="info" className="text-on-surface-variant" />
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Deeper report types (cohort retention, client profitability, forecast accuracy) extend from this same card/table system in a later phase — see Section 6 of the build spec.
        </p>
      </Card>

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
