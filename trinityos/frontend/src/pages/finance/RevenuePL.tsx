import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { FinanceSubNav } from "../../components/layout/FinanceSubNav";
import { KPICard } from "../../components/ui/KPICard";
import { Card } from "../../components/ui/Card";
import { StatusPill } from "../../components/ui/StatusPill";
import { TrendChart } from "../../components/charts/TrendChart";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { calculateRevenue, calculateExpenses, calculateNetProfit, calculateOutstandingReceivables } from "../../lib/calculations";
import { formatCurrency, formatDate } from "../../lib/format";
import { newId, nowIso } from "../../lib/id";
import { toast } from "../../components/ui/Toast";
import type { RevenueEntry } from "../../types";

type Period = "3m" | "6m" | "12m";

export default function RevenuePL() {
  const { revenue, expenses, invoices, clients, company, addEntity } = useStore();
  const navigate = useNavigate();
  const requestCreate = useUiStore((s) => s.requestCreate);
  const [period, setPeriod] = useState<Period>("6m");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", service: "", amount: 0, is_recurring: false });

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const revYTD = calculateRevenue(revenue, yearStart);
  const expYTD = calculateExpenses(expenses, yearStart);
  const netProfit = calculateNetProfit(revenue, expenses, yearStart);
  const outstanding = calculateOutstandingReceivables(invoices);

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

  // Recent Transactions — revenue + expenses combined, newest first (reference: "Recent Transactions")
  const recentTransactions = useMemo(() => {
    const revRows = revenue.map((r) => ({
      id: r.id,
      date: r.date,
      title: clients.find((c) => c.id === r.client_id)?.name ?? "Revenue",
      subtitle: r.service || "Payment received",
      amount: r.amount,
      positive: true,
      status: "Paid" as const,
    }));
    const expRows = expenses.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.vendor,
      subtitle: `Expense · ${e.category}`,
      amount: -e.amount,
      positive: false,
      status: "Cleared" as const,
    }));
    return [...revRows, ...expRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [revenue, expenses, clients]);

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

  return (
    <AppShell>
      <PageHeader
        title="Finance Overview"
        subtitle="Track your revenue, expenses, and overall financial health."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                requestCreate("expense");
                navigate("/finance/expenses");
              }}
            >
              Add Expense
            </Button>
            <Button
              variant="primary"
              icon={<Icon name="add" size={18} />}
              onClick={() => {
                requestCreate("invoice");
                navigate("/finance/invoices");
              }}
            >
              Create Invoice
            </Button>
          </div>
        }
      />
      <FinanceSubNav />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Revenue (YTD)" value={formatCurrency(revYTD, company.currency)} icon="show_chart" hasData={revenue.length > 0} height={110} />
        <KPICard label="Expenses (YTD)" value={formatCurrency(expYTD, company.currency)} icon="trending_down" hasData={expenses.length > 0} height={110} />
        <KPICard label="Net Profit" value={formatCurrency(netProfit, company.currency)} icon="account_balance_wallet" hasData={revenue.length > 0 || expenses.length > 0} height={110} />
        <KPICard
          label="Outstanding"
          value={formatCurrency(outstanding, company.currency)}
          icon="receipt_long"
          hasData={invoices.length > 0}
          alert={outstanding > 0}
          alertText={outstanding > 0 ? `${invoices.filter((i) => i.status !== "Paid").length} pending invoices` : undefined}
          height={110}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-headline-md">Revenue vs Expenses</h3>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-auto py-1.5 text-label-sm rounded-lg">
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

        <Card padded={false}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h3 className="font-headline-md text-headline-md">Recent Transactions</h3>
            <button onClick={() => navigate("/finance/invoices")} className="text-label-sm font-label-bold text-primary hover:underline uppercase">
              View All
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-body-sm font-body-sm text-outline px-6 pb-6">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-body-sm text-on-surface truncate">{t.title}</div>
                    <div className="text-xs text-on-surface-variant truncate">
                      {t.subtitle} · {formatDate(t.date)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-semibold text-body-sm ${t.positive ? "text-status-success-text" : "text-error"}`}>
                      {t.positive ? "+" : "-"}
                      {formatCurrency(Math.abs(t.amount), company.currency)}
                    </div>
                    <StatusPill label={t.status} tone={t.positive ? "success" : "neutral"} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
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
