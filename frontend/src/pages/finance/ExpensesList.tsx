import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { FinanceSubNav } from "../../components/layout/FinanceSubNav";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { KPICard } from "../../components/ui/KPICard";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { formatCurrency, formatDate } from "../../lib/format";
import { calculateExpenses } from "../../lib/calculations";
import { toast } from "../../components/ui/Toast";
import type { Expense, ExpenseCategory } from "../../types";

const CATEGORIES: ExpenseCategory[] = ["Software", "Payroll", "Marketing", "Contractors", "Office", "Other"];

export default function ExpensesList() {
  const { expenses, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vendor: "", category: "Software" as ExpenseCategory, amount: 0, notes: "" });

  useEffect(() => {
    if (requestedCreate === "expense") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const thisMonth = calculateExpenses(expenses);
  const byCategory = CATEGORIES.map((cat) => ({ cat, total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0) })).filter((c) => c.total > 0);
  const topCategory = byCategory.sort((a, b) => b.total - a.total)[0];

  function handleCreate() {
    if (!form.vendor || form.amount <= 0) {
      toast.error("Vendor and amount are required");
      return;
    }
    const expense: Expense = {
      id: newId(),
      company_id: company.id,
      date: nowIso(),
      category: form.category,
      vendor: form.vendor,
      amount: form.amount,
      notes: form.notes,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("expenses", expense);
    toast.success("Expense recorded");
    setModalOpen(false);
    setForm({ vendor: "", category: "Software", amount: 0, notes: "" });
  }

  const columns: Column<Expense>[] = [
    { key: "date", label: "Date", sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    { key: "vendor", label: "Vendor", sortValue: (r) => r.vendor, render: (r) => <span className="font-semibold">{r.vendor}</span> },
    { key: "category", label: "Category", hideOnMobile: true, render: (r) => <StatusPill label={r.category} tone="neutral" /> },
    { key: "notes", label: "Notes", hideOnMobile: true, render: (r) => <span className="text-on-surface-variant truncate">{r.notes ?? "—"}</span> },
    { key: "amount", label: "Amount", align: "right", sortValue: (r) => r.amount, render: (r) => <span className="font-semibold">{formatCurrency(r.amount, company.currency)}</span> },
  ];

  return (
    <AppShell>
      <PageHeader title="Expenses" right={<Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>Add Expense</Button>} />
      <FinanceSubNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <KPICard label="This Month" value={formatCurrency(thisMonth, company.currency)} hasData={expenses.length > 0} height={100} />
        <KPICard label="Top Category" value={topCategory ? topCategory.cat : "—"} hasData={!!topCategory} height={100} />
        <KPICard label="Total Line Items" value={expenses.length} hasData={expenses.length > 0} height={100} />
      </div>

      <DataTable
        columns={columns}
        rows={[...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        searchFields={(r) => `${r.vendor} ${r.category} ${r.notes ?? ""}`}
        exportFilename="expenses"
        emptyState={{ icon: "account_balance_wallet", title: "No expenses recorded yet", description: "Log your costs to see accurate net profit and margin on the P&L.", actionLabel: "+ Add your first expense", onAction: () => setModalOpen(true) }}
        height={460}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Add Expense</Button>
          </>
        }
      >
        <Field label="Vendor" required>
          <TextInput value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Figma" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Amount" required>
            <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Notes">
          <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </Field>
      </Modal>
    </AppShell>
  );
}
