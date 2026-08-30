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
import { formatCurrency, formatDate, isOverdue } from "../../lib/format";
import { calculateOutstandingReceivables, calculateOverdueAmount } from "../../lib/calculations";
import { recordPayment, sweepOverdueInvoices } from "../../lib/cascades";
import { toast } from "../../components/ui/Toast";
import type { Invoice, Payment } from "../../types";

export default function InvoicesList() {
  const { invoices, clients, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<Payment["method"]>("Bank Transfer");
  const [form, setForm] = useState({ client_id: "", amount: 0, due_date: "" });

  useEffect(() => {
    sweepOverdueInvoices();
  }, []);

  useEffect(() => {
    if (requestedCreate === "invoice") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const receivables = calculateOutstandingReceivables(invoices);
  const overdueAmount = calculateOverdueAmount(invoices);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paidThisMonth = invoices
    .filter((i) => i.status === "Paid" && new Date(i.updated_at) >= monthStart)
    .reduce((sum, i) => sum + i.amount_paid, 0);

  function handleCreate() {
    if (!form.client_id || form.amount <= 0) {
      toast.error("Client and amount are required");
      return;
    }
    const invoice: Invoice = {
      id: newId(),
      company_id: company.id,
      invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      client_id: form.client_id,
      issue_date: nowIso(),
      due_date: form.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount: form.amount,
      amount_paid: 0,
      status: "Unpaid",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("invoices", invoice);
    toast.success("Invoice created");
    setModalOpen(false);
    setForm({ client_id: "", amount: 0, due_date: "" });
  }

  function handleRecordPayment() {
    if (!payModal || payAmount <= 0) return;
    recordPayment(payModal.id, payAmount, payMethod);
    toast.success("Payment recorded — invoice, client balance, and revenue ledger updated");
    setPayModal(null);
    setPayAmount(0);
  }

  const columns: Column<Invoice>[] = [
    { key: "number", label: "Invoice #", width: "w-28", render: (r) => <span className="font-semibold">{r.invoice_number}</span> },
    { key: "client", label: "Client", sortValue: (r) => clients.find((c) => c.id === r.client_id)?.name ?? "", render: (r) => clients.find((c) => c.id === r.client_id)?.name ?? "—" },
    { key: "issue", label: "Issue Date", hideOnMobile: true, render: (r) => formatDate(r.issue_date) },
    {
      key: "due",
      label: "Due Date",
      hideOnMobile: true,
      sortValue: (r) => r.due_date,
      render: (r) => <span className={isOverdue(r.due_date, r.status === "Paid") ? "text-error font-semibold" : ""}>{formatDate(r.due_date)}</span>,
    },
    { key: "amount", label: "Amount", align: "right", sortValue: (r) => r.amount, render: (r) => <span className="font-semibold">{formatCurrency(r.amount, company.currency)}</span> },
    { key: "status", label: "Status", width: "w-28", align: "center", render: (r) => <StatusPill label={r.status} /> },
    {
      key: "actions",
      label: "",
      width: "w-32",
      align: "right",
      render: (r) =>
        r.status !== "Paid" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPayModal(r);
              setPayAmount(r.amount - r.amount_paid);
            }}
            className="text-primary text-xs font-bold hover:underline"
          >
            Record Payment
          </button>
        ) : (
          <span className="text-xs text-status-active-text font-semibold">Paid in full</span>
        ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Invoices"
        right={
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" icon={<Icon name="filter_list" size={16} />}>Filter</Button>
            <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>New Invoice</Button>
          </div>
        }
      />
      <FinanceSubNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <KPICard label="Total Receivables" value={formatCurrency(receivables, company.currency)} hasData={invoices.length > 0} height={110} />
        <KPICard label="Overdue Amount" value={formatCurrency(overdueAmount, company.currency)} hasData={invoices.length > 0} alert={overdueAmount > 0} alertText={overdueAmount > 0 ? "Needs follow-up" : undefined} height={110} />
        <KPICard label="Paid This Month" value={formatCurrency(paidThisMonth, company.currency)} hasData={invoices.some((i) => i.status === "Paid")} height={110} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-headline-md text-headline-md">Recent Invoices</h3>
        </div>
        <DataTable
          columns={columns}
          rows={invoices}
          searchFields={(r) => `${r.invoice_number} ${clients.find((c) => c.id === r.client_id)?.name ?? ""}`}
          exportFilename="invoices"
          exportMapper={(r) => ({ Number: r.invoice_number, Client: clients.find((c) => c.id === r.client_id)?.name, Amount: r.amount, Status: r.status, "Due Date": r.due_date })}
          emptyState={{ icon: "receipt_long", title: "No invoices yet", description: "Invoices appear here once a deal is won, or you can create one directly.", actionLabel: "+ New Invoice", onAction: () => setModalOpen(true) }}
          height={480}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Invoice"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Invoice</Button>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" required>
            <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </Field>
          <Field label="Due Date">
            <TextInput type="date" onChange={(e) => setForm({ ...form, due_date: new Date(e.target.value).toISOString() })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Record Payment — ${payModal?.invoice_number ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleRecordPayment}>Record Payment</Button>
          </>
        }
      >
        <Field label="Amount" required>
          <TextInput type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
        </Field>
        <Field label="Method">
          <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value as Payment["method"])}>
            <option>Bank Transfer</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Cash</option>
            <option>Other</option>
          </Select>
        </Field>
      </Modal>
    </AppShell>
  );
}
