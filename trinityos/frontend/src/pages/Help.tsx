import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";

const TOPICS = [
  { title: "Converting a lead to a client", body: "Open Leads, then use \"Convert to Client\" on any row. This creates a Client, a primary Contact, and a starter Deal, carrying every field forward automatically." },
  { title: "Winning a deal", body: "Drag a deal card into the Won column on the Pipeline board. This creates a Project with starter tasks and a draft Invoice." },
  { title: "Recording a payment", body: "On Invoices, use \"Record Payment\" on any unpaid row. This updates the invoice status, adds a revenue ledger entry, and — once the linked project is complete — may surface an upsell opportunity." },
  { title: "Demo data", body: "Load sample data from Settings to see the OS with realistic numbers. It's clearly flagged and can be reset without touching anything you've entered yourself." },
];

export default function Help() {
  return (
    <AppShell>
      <PageHeader title="Help" subtitle="How the core workflows in TrinityAI Business OS fit together." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {TOPICS.map((t) => (
          <Card key={t.title} className="flex gap-3">
            <Icon name="help" className="text-on-surface-variant flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-headline-md text-headline-md mb-1">{t.title}</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{t.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
