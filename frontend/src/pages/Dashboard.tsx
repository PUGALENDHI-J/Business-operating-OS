import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";
import { TrendChart } from "../components/charts/TrendChart";
import { FollowUpRow } from "../components/crm/FollowUpRow";
import { FollowUpActionModal } from "../components/crm/FollowUpActionModal";
import { useStore } from "../lib/store";
import { calculateRevenue, calculateNetProfit, getActiveFollowUps } from "../lib/calculations";
import { formatCurrency, formatDate } from "../lib/format";
import { DEAL_STAGES } from "../types";
import type { FollowUp } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { leads, clients, deals, projects, revenue, expenses, goals, tasks, invoices, payments, insights, followUps, loadDemoData, hasDemoData, company } = useStore();
  const [chartRange] = useState<"6m" | "12m">("6m");
  const [actionFollowUp, setActionFollowUp] = useState<FollowUp | null>(null);
  const [actionMode, setActionMode] = useState<"complete" | "reschedule" | null>(null);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const rev = calculateRevenue(revenue);
  const netProfit = calculateNetProfit(revenue, expenses);
  const newLeads = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
  const primaryGoal = goals[0];

  const hasFinanceData = revenue.length > 0 || expenses.length > 0;
  const hasAnyData = leads.length + clients.length + deals.length + revenue.length > 0;

  // Top KPIs — "who are my clients / what's the total project value / how much
  // is paid vs pending" answered immediately, no manual calculation (spec Section 21)
  const totalProjectValue = clients.reduce((s, c) => s + (c.project_value || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = Math.max(0, totalProjectValue - totalCollected);
  const activeClients = clients.filter((c) => c.status !== "Inactive").length;
  const activeProjectsCount = projects.filter((p) => p.status === "In Progress" || p.status === "Planning" || p.status === "At Risk").length;

  const chartData = useMemo(() => {
    const months = chartRange === "6m" ? 6 : 12;
    const points = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const actual = calculateRevenue(revenue, start, end);
      const target = primaryGoal ? primaryGoal.target_value / 24 : undefined; // rough monthly slice of the long-term goal
      points.push({ label, primary: actual, secondary: target });
    }
    return points;
  }, [revenue, chartRange, primaryGoal]);

  const pipelineStages = DEAL_STAGES.filter((s) => s !== "Won" && s !== "Lost");
  const activeInsights = insights.filter((i) => !i.dismissed).slice(0, 3);
  const todaysTasks = tasks.filter((t) => t.status !== "Done").slice(0, 4);

  // Today's Actions — daily-operations surface (spec Section 20)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const newLeadsToday = leads.filter((l) => new Date(l.created_at) >= todayStart).length;
  const todayFollowUps = leads.filter((l) => l.next_follow_up && new Date(l.next_follow_up) >= todayStart && new Date(l.next_follow_up) <= todayEnd && l.status !== "Converted");
  const overdueFollowUps = leads.filter((l) => l.next_follow_up && new Date(l.next_follow_up) < todayStart && l.status !== "Converted");
  const paymentsDue = invoices.filter((i) => i.status === "Unpaid" || i.status === "Overdue");
  const projectsAtRisk = projects.filter((p) => p.status === "At Risk");
  const tasksDueToday = tasks.filter((t) => t.status !== "Done" && t.due_date && new Date(t.due_date) >= todayStart && new Date(t.due_date) <= todayEnd);
  const activeFollowUps = useMemo(() => getActiveFollowUps(followUps), [followUps]);

  return (
    <AppShell>
      <PageHeader
        title={`Good ${greeting()}.`}
        subtitle="Here is the state of your business operations today."
        right={
          <div className="text-sm text-outline flex items-center gap-2">
            <Icon name="calendar_today" size={16} />
            <span>Today, {formatDate(new Date().toISOString())}</span>
          </div>
        }
      />

      {!hasAnyData && !hasDemoData && (
        <Card className="flex items-center justify-between flex-wrap gap-3 border-dashed">
          <div className="flex items-center gap-3">
            <Icon name="auto_awesome" className="text-secondary-container" />
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

      {/* Top KPIs — answers "what's happening" at a glance, no manual math (spec Section 21) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Total Project Value" value={formatCurrency(totalProjectValue, company.currency)} icon="account_balance_wallet" hasData={totalProjectValue > 0} onClick={() => navigate("/crm/clients")} />
        <KPICard label="Total Collected" value={formatCurrency(totalCollected, company.currency)} icon="payments" hasData={totalCollected > 0} onClick={() => navigate("/finance/revenue")} />
        <KPICard label="Total Outstanding" value={formatCurrency(totalOutstanding, company.currency)} icon="warning" hasData={totalOutstanding > 0} alert={totalOutstanding > 0} alertText={totalOutstanding > 0 ? "Requires action" : undefined} onClick={() => navigate("/crm/clients")} />
        <KPICard label="Revenue" value={formatCurrency(rev, company.currency)} icon="trending_up" hasData={revenue.length > 0} emptyAction={{ label: "+ Add", onClick: () => navigate("/finance/revenue") }} onClick={() => navigate("/finance/revenue")} />
        <KPICard label="Profit" value={formatCurrency(netProfit, company.currency)} icon="monitoring" hasData={hasFinanceData} emptyAction={{ label: "+ Add", onClick: () => navigate("/finance/expenses") }} onClick={() => navigate("/finance/revenue")} />
        <KPICard label="New Leads" value={newLeads} icon="group_add" hasData={leads.length > 0} emptyAction={{ label: "+ Add", onClick: () => navigate("/crm/leads") }} onClick={() => navigate("/crm/leads")} />
        <KPICard label="Active Clients" value={activeClients} icon="groups" hasData={clients.length > 0} emptyAction={{ label: "+ Add", onClick: () => navigate("/crm/clients") }} onClick={() => navigate("/crm/clients")} />
        <KPICard label="Active Projects" value={activeProjectsCount} icon="folder_open" hasData={projects.length > 0} emptyAction={{ label: "+ Add", onClick: () => navigate("/operations/projects") }} onClick={() => navigate("/operations/projects")} />
      </div>

      {/* Today's Actions — turns the dashboard into a daily work surface (spec Section 20) */}
      {(todayFollowUps.length + overdueFollowUps.length + newLeadsToday + paymentsDue.length + projectsAtRisk.length + tasksDueToday.length > 0) && (
        <Card>
          <h3 className="font-headline-md text-headline-md mb-4">Today's Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <TodayAction icon="group_add" count={newLeadsToday} label="New Leads" onClick={() => navigate("/crm/leads")} />
            <TodayAction icon="event" count={todayFollowUps.length} label="Follow-ups Today" onClick={() => navigate("/crm/leads")} />
            <TodayAction icon="event_busy" count={overdueFollowUps.length} label="Overdue Follow-ups" alert onClick={() => navigate("/crm/leads")} />
            <TodayAction icon="receipt_long" count={paymentsDue.length} label="Payments Due" onClick={() => navigate("/finance/invoices")} />
            <TodayAction icon="warning" count={projectsAtRisk.length} label="Projects At Risk" alert={projectsAtRisk.length > 0} onClick={() => navigate("/operations/projects")} />
            <TodayAction icon="task_alt" count={tasksDueToday.length} label="Tasks Due Today" onClick={() => navigate("/operations/tasks")} />
          </div>
        </Card>
      )}

      {/* Today's Follow-ups — client/project follow-ups with working Call/WhatsApp/Complete/Reschedule (spec Section 26) */}
      {(activeFollowUps.overdue.length + activeFollowUps.today.length + activeFollowUps.upcoming.length > 0) && (
        <Card>
          <h3 className="font-headline-md text-headline-md mb-2">Today's Follow-ups</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <FollowUpBucketColumn
              title="Overdue"
              tone="overdue"
              items={activeFollowUps.overdue}
              emptyLabel="No overdue follow-ups"
              onComplete={(f) => {
                setActionFollowUp(f);
                setActionMode("complete");
              }}
              onReschedule={(f) => {
                setActionFollowUp(f);
                setActionMode("reschedule");
              }}
            />
            <FollowUpBucketColumn
              title="Today"
              tone="warning"
              items={activeFollowUps.today}
              emptyLabel="Nothing due today"
              onComplete={(f) => {
                setActionFollowUp(f);
                setActionMode("complete");
              }}
              onReschedule={(f) => {
                setActionFollowUp(f);
                setActionMode("reschedule");
              }}
            />
            <FollowUpBucketColumn
              title="Upcoming"
              tone="neutral"
              items={activeFollowUps.upcoming}
              emptyLabel="Nothing scheduled"
              onComplete={(f) => {
                setActionFollowUp(f);
                setActionMode("complete");
              }}
              onReschedule={(f) => {
                setActionFollowUp(f);
                setActionMode("reschedule");
              }}
            />
          </div>
        </Card>
      )}

      <FollowUpActionModal
        followUp={actionFollowUp}
        mode={actionMode}
        onClose={() => {
          setActionFollowUp(null);
          setActionMode(null);
        }}
      />

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
          <Card className="h-[340px] flex flex-col" style={{ height: 340 }}>
            <h3 className="font-headline-md text-headline-md mb-4">Revenue vs Target</h3>
            {revenue.length === 0 ? (
              <div className="flex-1 border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-outline bg-surface-container-low/50">
                <Icon name="bar_chart" size={40} className="mb-2" />
                <p className="font-body-sm text-body-sm">No revenue data to display</p>
                <Button variant="secondary" className="mt-4" onClick={() => navigate("/finance/revenue")}>
                  Connect Data Source
                </Button>
              </div>
            ) : (
              <div className="flex-1">
                <TrendChart data={chartData} primaryLabel="Revenue" secondaryLabel={primaryGoal ? "Target" : undefined} valueFormatter={(v) => formatCurrency(v, company.currency)} height={260} />
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <Card className="h-[280px] flex flex-col" style={{ height: 280 }}>
              <h3 className="font-headline-md text-headline-md mb-4">Sales Pipeline</h3>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {pipelineStages.map((stage) => {
                  const stageDeals = deals.filter((d) => d.stage === stage);
                  const value = stageDeals.reduce((s, d) => s + d.value, 0);
                  const has = stageDeals.length > 0;
                  return (
                    <div
                      key={stage}
                      className={`rounded p-2 flex justify-between items-center text-sm border ${
                        has ? "bg-surface-container-low border-outline-variant/50" : "bg-surface-container-low border-outline-variant/50 border-dashed"
                      }`}
                    >
                      <span className="text-on-surface-variant">{stage}</span>
                      <span className={has ? "text-on-surface font-semibold" : "text-outline"}>
                        {formatCurrency(value, company.currency)} ({stageDeals.length})
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <button onClick={() => navigate("/crm/pipeline")} className="text-primary font-label-bold text-label-bold hover:underline">
                  + Add Deal
                </button>
              </div>
            </Card>

            <Card className="h-[280px] flex flex-col" style={{ height: 280 }}>
              <h3 className="font-headline-md text-headline-md mb-4">Finance Summary</h3>
              {!hasFinanceData ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                    <Icon name="account_balance_wallet" className="text-outline" size={28} />
                  </div>
                  <p className="text-on-surface-variant font-body-sm text-body-sm mb-4">Record your first invoice or expense to see cashflow insights here.</p>
                  <Button variant="primary" onClick={() => navigate("/finance/invoices")}>
                    Go to Finance
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Revenue (this month)</span>
                    <span className="font-semibold">{formatCurrency(rev, company.currency)}</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Outstanding receivables</span>
                    <span className="font-semibold">
                      {formatCurrency(invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + (i.amount - i.amount_paid), 0), company.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Net profit</span>
                    <span className={`font-semibold ${netProfit < 0 ? "text-error" : ""}`}>{formatCurrency(netProfit, company.currency)}</span>
                  </div>
                  <Button variant="secondary" className="mt-2" onClick={() => navigate("/finance/revenue")}>
                    View full P&L
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <Card className="relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary-fixed-dim/20 rounded-full blur-2xl" />
            <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
              <Icon name="smart_toy" className="text-secondary-container" />
              TrinityAI Insights
            </h3>
            {activeInsights.length === 0 ? (
              <>
                <p className="text-on-surface-variant text-sm mb-4">Your business needs more data to generate actionable insights.</p>
                <div className="space-y-3">
                  {[0.5, 0.4, 0.3].map((opacity, i) => (
                    <div key={i} className="bg-surface rounded p-3 border border-outline-variant/50 flex gap-3" style={{ opacity }}>
                      <Icon name="check_circle" className="text-outline mt-0.5" size={18} />
                      <div className="flex-1">
                        <div className="h-4 bg-surface-variant rounded w-3/4 mb-2 animate-pulse-soft" />
                        <div className="h-3 bg-surface-variant rounded w-1/2 animate-pulse-soft" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {activeInsights.map((insight) => (
                  <div key={insight.id} className="bg-surface rounded p-3 border border-outline-variant/50 flex gap-3">
                    <Icon
                      name={insight.severity === "critical" ? "error" : insight.severity === "warning" ? "warning" : "lightbulb"}
                      className={insight.severity === "critical" ? "text-error" : insight.severity === "warning" ? "text-status-warning-text" : "text-secondary-container"}
                      size={18}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-body-sm font-semibold text-on-surface">{insight.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{insight.body}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate("/ai")} className="text-primary font-label-bold text-label-bold hover:underline text-sm">
                  View all insights →
                </button>
              </div>
            )}
          </Card>

          <Card className="flex-1 flex flex-col min-h-[250px]">
            <h3 className="font-headline-md text-headline-md mb-4">Today's Tasks</h3>
            {todaysTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Icon name="task_alt" className="text-outline mb-2" size={36} />
                <p className="text-on-surface-variant font-body-sm text-body-sm mb-4">No tasks scheduled for today.</p>
                <Button variant="secondary" onClick={() => navigate("/operations/tasks")}>
                  + Create Task
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {todaysTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-surface-container-low">
                    <span className="text-body-sm font-body-sm text-on-surface truncate">{t.title}</span>
                    <StatusPill label={t.priority} />
                  </div>
                ))}
                <button onClick={() => navigate("/operations/tasks")} className="text-primary font-label-bold text-label-bold hover:underline text-sm text-center mt-1">
                  View all tasks →
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function TodayAction({ icon, count, label, alert = false, onClick }: { icon: string; count: number; label: string; alert?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
        alert && count > 0
          ? "border-error/40 bg-error-container/40 hover:bg-error-container/60"
          : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
      }`}
    >
      <Icon name={icon} size={18} className={alert && count > 0 ? "text-error" : "text-on-surface-variant"} />
      <span className={`text-2xl font-extrabold leading-tight ${alert && count > 0 ? "text-on-error-container" : "text-on-surface"}`}>{count}</span>
      <span className="text-xs text-on-surface-variant leading-tight">{label}</span>
    </button>
  );
}

function FollowUpBucketColumn({
  title,
  tone,
  items,
  emptyLabel,
  onComplete,
  onReschedule,
}: {
  title: string;
  tone: "overdue" | "warning" | "neutral";
  items: FollowUp[];
  emptyLabel: string;
  onComplete: (f: FollowUp) => void;
  onReschedule: (f: FollowUp) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <StatusPill label={title} tone={tone} />
        <span className="text-xs text-on-surface-variant">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-outline py-2">{emptyLabel}</p>
      ) : (
        <div>
          {items.map((f) => (
            <FollowUpRow key={f.id} followUp={f} onComplete={onComplete} onReschedule={onReschedule} />
          ))}
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
