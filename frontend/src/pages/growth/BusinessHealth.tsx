import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { useStore } from "../../lib/store";
import { calculateBusinessHealth } from "../../lib/calculations";

const LABELS: Record<string, { label: string; icon: string }> = {
  revenue: { label: "Revenue", icon: "payments" },
  sales: { label: "Sales", icon: "view_kanban" },
  marketing: { label: "Marketing", icon: "campaign" },
  finance: { label: "Finance", icon: "account_balance_wallet" },
  ops: { label: "Operations", icon: "inventory_2" },
  retention: { label: "Retention", icon: "diversity_3" },
  goals: { label: "Goals", icon: "flag" },
};

export default function BusinessHealth() {
  const { revenue, expenses, deals, invoices, projects, clients, goals, adCampaigns } = useStore();
  const health = calculateBusinessHealth({ revenue, expenses, deals, invoices, projects, clients, goals, adCampaigns });

  const hasAnyData = revenue.length + expenses.length + deals.length + invoices.length + projects.length + clients.length + goals.length + adCampaigns.length > 0;

  return (
    <AppShell>
      <PageHeader title="Business Health" subtitle="A single score, built transparently from live data across the business." />

      <Card className="flex flex-col items-center justify-center py-10">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={health.overall >= 70 ? "#0369A1" : health.overall >= 45 ? "#92400E" : "#991B1B"}
              strokeWidth="10"
              strokeDasharray={`${(health.overall / 100) * 264} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-metric-lg text-metric-lg">{health.overall}</span>
            <span className="text-xs text-on-surface-variant">/ 100</span>
          </div>
        </div>
        {!hasAnyData && <p className="text-on-surface-variant text-body-sm font-body-sm mt-4 max-w-md text-center">No data yet — every dimension is scored neutral (50) until you start recording activity.</p>}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {Object.entries(LABELS).map(([key, meta]) => {
          const score = (health as unknown as Record<string, number>)[key];
          return (
            <Card key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">{meta.label}</span>
                <span className="font-headline-md text-headline-md">{score}</span>
              </div>
              <ProgressBar value={score} variant={score < 45 ? "at-risk" : score >= 80 ? "complete" : "normal"} />
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
