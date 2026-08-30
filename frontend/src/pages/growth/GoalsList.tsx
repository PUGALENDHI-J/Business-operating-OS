import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { useStore } from "../../lib/store";
import { calculateGoalProgress, calculateGoalStatus } from "../../lib/calculations";
import { formatCurrency, formatDate } from "../../lib/format";
import { newId, nowIso } from "../../lib/id";
import { toast } from "../../components/ui/Toast";
import type { Goal } from "../../types";

const STATUS_TONE: Record<Goal["status"], "active" | "warning" | "overdue"> = {
  Ahead: "active",
  "On Track": "active",
  "At Risk": "warning",
  Behind: "overdue",
};

export default function GoalsList() {
  const { goals, company, addEntity } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", metric: "Revenue" as Goal["metric"], target_value: 0, end_date: "" });

  function handleCreate() {
    if (!form.title || form.target_value <= 0) {
      toast.error("Title and target are required");
      return;
    }
    const goal: Goal = {
      id: newId(),
      company_id: company.id,
      title: form.title,
      metric: form.metric,
      target_value: form.target_value,
      current_value: 0,
      start_date: nowIso(),
      end_date: form.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: "On Track",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("goals", goal);
    toast.success("Goal created");
    setModalOpen(false);
    setForm({ title: "", metric: "Revenue", target_value: 0, end_date: "" });
  }

  return (
    <AppShell>
      <PageHeader title="Goals" subtitle="Long-term targets, decomposed into a Year → Quarter → Month → Week pace." right={<Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>Set Goal</Button>} />

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon="flag" title="No goals set" description="Set a long-term target and the OS will track your pace against it automatically." actionLabel="+ Set your first goal" onAction={() => setModalOpen(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {goals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            const status = calculateGoalStatus(goal);
            const isMoney = goal.metric === "Revenue" || goal.metric === "MRR" || goal.metric === "Net Profit";
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-headline-md text-headline-md">{goal.title}</h3>
                    <p className="text-on-surface-variant text-body-sm font-body-sm mt-0.5">
                      {isMoney ? formatCurrency(goal.current_value, company.currency) : goal.current_value} of {isMoney ? formatCurrency(goal.target_value, company.currency) : goal.target_value}
                    </p>
                  </div>
                  <StatusPill label={status} tone={STATUS_TONE[status]} />
                </div>
                <ProgressBar value={progress} variant={status === "Behind" || status === "At Risk" ? "at-risk" : "normal"} />
                <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                  <span>{Math.round(progress)}% complete</span>
                  <span>Target: {formatDate(goal.end_date)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Set Goal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Set Goal</Button>
          </>
        }
      >
        <Field label="Goal Title" required>
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="₹60L ARR in 24 months" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Metric">
            <Select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value as Goal["metric"] })}>
              <option>Revenue</option>
              <option>New Clients</option>
              <option>MRR</option>
              <option>Net Profit</option>
            </Select>
          </Field>
          <Field label="Target Value" required>
            <TextInput type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Target Date">
          <TextInput type="date" onChange={(e) => setForm({ ...form, end_date: new Date(e.target.value).toISOString() })} />
        </Field>
      </Modal>
    </AppShell>
  );
}
