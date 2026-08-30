import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useStore } from "../../lib/store";
import { formatDate } from "../../lib/format";
import type { AiInsight } from "../../types";

const SEVERITY_STYLE: Record<string, { icon: string; color: string }> = {
  critical: { icon: "error", color: "text-error" },
  warning: { icon: "warning", color: "text-status-warning-text" },
  info: { icon: "lightbulb", color: "text-secondary-container" },
};

const SOURCE_LABEL: Record<string, string> = {
  daily_briefing: "Daily Briefing",
  weekly_review: "Weekly Review",
  alert: "Alert",
  upsell: "Upsell",
};

export default function AIAdvisor() {
  const { insights, updateEntity } = useStore();
  const active = insights.filter((i) => !i.dismissed);
  const dismissed = insights.filter((i) => i.dismissed);

  return (
    <AppShell>
      <PageHeader title="AI Advisor" subtitle="Daily briefings, weekly reviews, and proactive alerts — generated only from your live data." />

      <Card className="flex items-start gap-3 bg-secondary-fixed/10 border-secondary-container/30">
        <Icon name="smart_toy" className="text-secondary-container mt-0.5" />
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          TrinityAI reads your CRM, finance, and operations data to surface what needs attention. It never invents numbers or claims an action it hasn't taken — every insight links back to a real record.
        </p>
      </Card>

      {active.length === 0 ? (
        <Card>
          <EmptyState icon="smart_toy" title="No insights yet" description="As leads, deals, invoices, and projects accumulate, the AI Advisor will surface what needs your attention here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((insight) => {
            const style = SEVERITY_STYLE[insight.severity];
            return (
              <Card key={insight.id} className="flex items-start gap-4">
                <Icon name={style.icon} className={`${style.color} mt-0.5`} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-headline-md text-headline-md">{insight.title}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
                      {SOURCE_LABEL[insight.source]}
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{insight.body}</p>
                  <p className="text-xs text-outline mt-1">{formatDate(insight.created_at)}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => updateEntity<AiInsight>("insights", insight.id, { dismissed: true })}>
                  Dismiss
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {dismissed.length > 0 && (
        <div>
          <h3 className="font-label-bold text-label-bold uppercase text-on-surface-variant mb-2">Dismissed</h3>
          <div className="space-y-2 opacity-60">
            {dismissed.map((insight) => (
              <Card key={insight.id} padded className="flex items-center gap-3 py-2">
                <Icon name="check" size={16} className="text-outline" />
                <span className="text-body-sm font-body-sm text-on-surface-variant">{insight.title}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
