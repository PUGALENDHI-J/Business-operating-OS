import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";

export default function ActivityPage() {
  return (
    <div>
      <PageHeader title="Activity" subtitle="A system-wide feed of what staff have been doing." />
      <Card>
        <EmptyState
          title="A global activity feed isn't available yet"
          description="The backend currently exposes activity per customer (see a customer's own Activity tab) but does not yet have a system-wide /activity endpoint. This page will populate automatically once that endpoint is added — nothing further is needed on the frontend."
        />
      </Card>
    </div>
  );
}
