import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";
import { Avatar } from "../components/ui/Avatar";
import { ContactActions } from "../components/ui/ContactActions";
import { useStore } from "../lib/store";
import { calculateRevenue, calculateNetProfit, getActiveFollowUps } from "../lib/calculations";
import { formatCurrency } from "../lib/format";
import { resolveFollowUpTarget } from "../lib/followUpHelpers";

export default function Dashboard() {
  const navigate = useNavigate();
  const { leads, clients, revenue, expenses, invoices, payments, insights, followUps, loadDemoData, hasDemoData, currentUser, company } = useStore();

  const rev = calculateRevenue(revenue);
  const netProfit = calculateNetProfit(revenue, expenses);
  const hasAnyData = leads.length + clients.length + revenue.length > 0;

  // Top KPIs (spec Section 21 / reference dashboard)
  const totalProjectValue = clients.reduce((s, c) => s + (c.project_value || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = Math.max(0, totalProjectValue - totalCollected);

  const activeInsights = insights.filter((i) => !i.dismissed).slice(0, 3);
  const activeFollowUps = useMemo(() => getActiveFollowUps(followUps), [followUps]);

  // My Day — three rows the reference calls out by name
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const overdueFollowUps = activeFollowUps.overdue;
  const todayFollowUps = activeFollowUps.today;
  const paymentsPending = invoices.filter((i) => i.status === "Unpaid" || i.status === "Overdue").reduce((s, i) => s + (i.amount - i.amount_paid), 0);

  // Today's Follow-ups list — overdue first, then today, capped (spec Section 26 / reference)
  const followUpFeed = [...overdueFollowUps, ...todayFollowUps].slice(0, 5);

  return (
    <AppShell>
      <PageHeader title={`Good ${greeting()}, ${currentUser.name.split(" ")[0]}.`} subtitle="Here is the state of your business operations today." />

      {!hasAnyData && !hasDemoData && (
        <Card className="flex items-center justify-between flex-wrap gap-3 border-dashed">
          <div className="flex items-center gap-3">
            <Icon name="auto_awesome" className="text-primary" />
            <div>
              <p className="font-headline-md text-headline-md text-on-surface">Your workspace is empty</p>
              <p className="text-on-surface-variant text-body-sm font-body-sm">Load sample data to see how the OS looks once your business is running through it.</p>
            </div>
          </div>
          <Button variant="primary" onClick={loadDemoData}>
            Load Demo Data
          </Button>
        </Card>
      )}

      {/* Top KPIs — Revenue, Net Profit, Total Project Value, Total Collected, Outstanding */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-gutter">
        <Card>
          <div className="flex items-start justify-between mb-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Revenue (YTD)</span>
            <Icon name="show_chart" size={18} className="text-status-success-text" />
          </div>
          <p className="font-headline-md text-headline-md text-on-surface">{formatCurrency(rev, company.currency)}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Net Profit</span>
            <Icon name="account_balance_wallet" size={18} className="text-status-success-text" />
          </div>
          <p className="font-headline-md text-headline-md text-on-surface">{formatCurrency(netProfit, company.currency)}</p>
        </Card>
        <Card className="bg-primary border-primary">
          <div className="flex items-start justify-between mb-2">
            <span className="text-label-sm font-label-sm text-on-primary/80 uppercase tracking-wide">Total Project Value</span>
            <Icon name="work" size={18} className="text-on-primary" />
          </div>
          <p className="font-headline-md text-headline-md text-on-primary">{formatCurrency(totalProjectValue, company.currency)}</p>
          <p className="text-xs text-on-primary/80 mt-1">Active pipeline</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Total Collected</span>
            <Icon name="payments" size={18} className="text-on-surface-variant" />
          </div>
          <p className="font-headline-md text-headline-md text-on-surface">{formatCurrency(totalCollected, company.currency)}</p>
        </Card>
        <Card className={totalOutstanding > 0 ? "border-primary/40" : ""}>
          <div className="flex items-start justify-between mb-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Outstanding Bal</span>
            {totalOutstanding > 0 && <Icon name="warning" size={18} className="text-primary" />}
          </div>
          <p className="font-headline-md text-headline-md text-on-surface">{formatCurrency(totalOutstanding, company.currency)}</p>
          {totalOutstanding > 0 && <StatusPill label="Requires action" tone="overdue" className="mt-2" />}
        </Card>
      </div>

      {/* My Day + Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
        <Card padded={false}>
          <h3 className="font-headline-md text-headline-md flex items-center gap-2 px-6 pt-6 pb-3">
            <Icon name="calendar_today" size={20} className="text-on-surface-variant" /> My Day
          </h3>
          <div className="px-6 pb-6 flex flex-col gap-3">
            <DayRow icon="call" tone="overdue" title="Call Now" subtitle={`${overdueFollowUps.length} urgent prospects`} onClick={() => navigate("/crm/leads")} />
            <DayRow icon="event_available" tone="success" title="Follow-up Today" subtitle={`${todayFollowUps.length} scheduled calls`} onClick={() => navigate("/crm/leads")} />
            <DayRow icon="account_balance_wallet" tone="warning" title="Payments to Collect" subtitle={`${formatCurrency(paymentsPending, company.currency)} pending`} onClick={() => navigate("/finance/invoices")} />
          </div>
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h3 className="font-headline-md text-headline-md flex items-center gap-2">
              <Icon name="person" size={20} className="text-on-surface-variant" /> Today's Follow-ups
            </h3>
            <button onClick={() => navigate("/crm/leads")} className="text-label-sm font-label-bold text-primary hover:underline uppercase">
              View All
            </button>
          </div>
          {followUpFeed.length === 0 ? (
            <p className="text-body-sm font-body-sm text-outline px-6 pb-6">Nothing due right now.</p>
          ) : (
            <div className="px-6 pb-6 flex flex-col gap-3">
              {followUpFeed.map((f) => {
                const target = resolveFollowUpTarget(f, { leads, clients });
                const isOverdue = overdueFollowUps.includes(f);
                return (
                  <div key={f.id} className={`flex items-center gap-3 pl-3 pr-3 py-3 rounded-lg bg-surface-container-low border-l-4 ${isOverdue ? "border-primary" : "border-status-success-text"}`}>
                    <Avatar name={target?.name || "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-body-sm text-on-surface truncate">{target?.name || "Unknown"}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusPill label={isOverdue ? "Overdue" : "Today"} tone={isOverdue ? "overdue" : "success"} />
                        <span className="text-xs text-on-surface-variant truncate">{target?.business}</span>
                      </div>
                    </div>
                    <ContactActions whatsapp={target?.whatsapp} phone={target?.phone} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* TrinityAI Insights — full width, 3-column */}
      <Card className="relative overflow-hidden">
        <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
          <Icon name="smart_toy" className="text-primary" />
          TrinityAI Insights
        </h3>
        {activeInsights.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Your business needs more data to generate actionable insights.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeInsights.map((insight) => (
              <div key={insight.id} className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/50">
                <Icon
                  name={insight.severity === "critical" ? "error" : insight.severity === "warning" ? "warning" : "lightbulb"}
                  className={insight.severity === "critical" ? "text-error" : insight.severity === "warning" ? "text-status-warning-text" : "text-primary"}
                  size={20}
                />
                <p className="text-body-sm font-body-sm font-semibold text-on-surface mt-2">{insight.title}</p>
                <p className="text-xs text-on-surface-variant mt-1">{insight.body}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function DayRow({ icon, tone, title, subtitle, onClick }: { icon: string; tone: "overdue" | "success" | "warning"; title: string; subtitle: string; onClick: () => void }) {
  const toneClasses: Record<typeof tone, string> = {
    overdue: "bg-status-overdue-bg text-status-overdue-text",
    success: "bg-status-success-bg text-status-success-text",
    warning: "bg-status-warning-bg text-status-warning-text",
  };
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-left">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClasses[tone]}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-body-sm text-on-surface">{title}</div>
        <div className="text-xs text-on-surface-variant">{subtitle}</div>
      </div>
      <Icon name="chevron_right" size={20} className="text-on-surface-variant flex-shrink-0" />
    </button>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
