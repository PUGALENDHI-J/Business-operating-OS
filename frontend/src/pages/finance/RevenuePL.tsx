import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { FinanceSubNav } from "../../components/layout/FinanceSubNav";
import { KPICard } from "../../components/ui/KPICard";
import { Card } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { TrendChart } from "../../components/charts/TrendChart";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { calculateRevenue, calculateMRR, calculateExpenses, calculateNetProfit, calculateNetMargin } from "../../lib/calculations";
import { formatCurrency, formatDate } from "../../lib/format";
import { newId, nowIso } from "../../lib/id";
import { toast } from "../../components/ui/Toast";
import type { RevenueEntry } from "../../types";

type Period = "3m" | "6m" | "12m";

export default function RevenuePL() {
  const { revenue, expenses, clients, company, addEntity } = useStore();
  const [period, setPeriod] = useState<Period>("6m");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", service: "", amount: 0, is_recurring: false });

  const rev = calculateRevenue(revenue);
  const mrr = calculateMRR(revenue);
  const grossProfit = calculateNetProfit(revenue, expenses); // simplified: no COGS split modeled yet
  const netMargin = calculateNetMargin(revenue, expenses);

  const chartData = useMemo(() => {
    const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    const points = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      points.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        primary: calculateRevenue(revenue, start, end),
        secondary: calculateExpenses(expenses, start, end),
      });
    }
    return points;
  }, [revenue, expenses, period]);

  function handleCreate() {
    if (!form.client_id || form.amount <= 0) {
      toast.error("Client and amount are required");
      return;
    }
    const entry: RevenueEntry = {
      id: newId(),
      company_id: company.id,
      date: nowIso(),
      client_id: form.client_id,
      service: form.service,
      amount: form.amount,
      is_recurring: form.is_recurring,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("revenue", entry);
    toast.success("Revenue recorded");
    setModalOpen(false);
    setForm({ client_id: "", service: "", amount: 0, is_recurring: false });
  }

  const columns: Column<RevenueEntry>[] = [
    { key: "date", label: "Date", sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    { key: "client", label: "Client", render: (r) => clients.find((c) => c.id === r.client_id)?.name ?? "—" },
    { key: "service", label: "Service", hideOnMobile: true, render: (r) => r.service ?? "—" },
    { key: "amount", label: "Amount", align: "right", sortValue: (r) => r.amount, render: (r) => <span className="font-semibold">{formatCurrency(r.amount, company.currency)}</span> },
  ];

  return (
    <AppShell>
      <PageHeader title="Finance Overview" subtitle="Track your revenue, expenses, and overall financial health." right={<Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>Record Revenue</Button>} />
      <FinanceSubNav />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Revenue This Month" value={formatCurrency(rev, company.currency)} hasData={revenue.length > 0} height={110} />
        <KPICard label="MRR" value={formatCurrency(mrr, company.currency)} hasData={revenue.some((r) => r.is_recurring)} height={110} />
        <KPICard label="Gross Profit" value={formatCurrency(grossProfit, company.currency)} hasData={revenue.length > 0} height={110} />
        <KPICard
          label="Net Margin"
          value={`${netMargin.toFixed(1)}%`}
          hasData={revenue.length > 0}
          trend={revenue.length > 0 ? { direction: netMargin >= 0 ? "up" : "down", label: `${netMargin.toFixed(1)}%` } : undefined}
          height={110}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline-md text-headline-md">Revenue vs Expenses</h3>
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-auto py-1.5 text-label-sm rounded-full">
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </Select>
        </div>
        {revenue.length === 0 && expenses.length === 0 ? (
          <div className="h-[260px] border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-outline">
            <Icon name="show_chart" size={40} className="mb-2" />
            <p className="font-body-sm text-body-sm">No revenue or expense data yet</p>
          </div>
        ) : (
          <TrendChart data={chartData} primaryLabel="Revenue" secondaryLabel="Expenses" valueFormatter={(v) => formatCurrency(v, company.currency)} />
        )}
      </Card>

      <div>
        <h3 className="font-headline-md text-headline-md mb-3">Recent Revenue Transactions</h3>
        <DataTable
          columns={columns}
          rows={[...revenue].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
          exportFilename="revenue"
          emptyState={{ icon: "payments", title: "No revenue recorded yet", description: "Record your first payment or recurring revenue entry.", actionLabel: "+ Record Revenue", onAction: () => setModalOpen(true) }}
          height={380}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Revenue"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Record</Button>
          </>
        }
      >
        <Field label="Client" required>
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Service / Description">
          <TextInput value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="Growth Retainer" />
        </Field>
        <Field label="Amount" required>
          <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </Field>
        <label className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
          <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
          This is recurring revenue (counts toward MRR)
        </label>
      </Modal>
    </AppShell>
  );
}
