"use client";

import { useState, FormEvent, useEffect } from "react";
import { RotateCcw, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { Payment, Installment, ListResponse } from "@/lib/types";

interface FormState { installment_id: string; amount: string; payment_method: string; reference_number: string; notes: string; }
const emptyForm: FormState = { installment_id: "", amount: "", payment_method: "cash", reference_number: "", notes: "" };

export default function PaymentsPage() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Payment>("/payments", {
    status: statusFilter || undefined,
  });

  const [pendingInstallments, setPendingInstallments] = useState<Installment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<Payment | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    setParams({ status: statusFilter || undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!modalOpen) return;
    api
      .get<ListResponse<Installment>>("/installments", { pageSize: 100, status: "pending" })
      .then((r) => setPendingInstallments(r.data))
      .catch(() => setPendingInstallments([]));
  }, [modalOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/payments", {
        installment_id: form.installment_id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        reference_number: form.reference_number || undefined,
        notes: form.notes || undefined,
      });
      showToast("Payment recorded and receipt generated.");
      setModalOpen(false);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseTarget) return;
    setReversing(true);
    try {
      await api.post(`/payments/${reverseTarget.id}/reverse`, { reason: reverseReason });
      showToast("Payment reversed.");
      setReverseTarget(null);
      setReverseReason("");
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to reverse payment.", "error");
    } finally {
      setReversing(false);
    }
  };

  const columns: Column<Payment>[] = [
    { key: "payment_date", header: "Date", sortable: true, render: (p) => formatDate(p.payment_date) },
    { key: "customer_name", header: "Customer", render: (p) => <span className="font-medium text-slate-800">{p.customer_name}</span> },
    { key: "group_code", header: "Group / Cycle", render: (p) => `${p.group_code} · Cycle ${p.cycle_number}` },
    { key: "amount", header: "Amount", sortable: true, render: (p) => formatCurrency(p.amount) },
    { key: "payment_method", header: "Method", render: (p) => titleCase(p.payment_method) },
    { key: "receipt_number", header: "Receipt", render: (p) => p.receipt_number ?? "—" },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (p) => can("payments", "delete") && p.status === "success" && (
        <button
          className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer"
          onClick={(e) => { e.stopPropagation(); setReverseTarget(p); }}
          title="Reverse payment"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Collections against chit installments, with receipts and reversal history."
        action={can("payments", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Record Payment</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search by customer or reference…" emptyTitle="No payments recorded yet"
          getRowKey={(p) => p.id}
          toolbarExtra={
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="reversed">Reversed</option>
              <option value="failed">Failed</option>
            </Select>
          }
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="installment_id">Installment (pending)</Label>
            <Select id="installment_id" required value={form.installment_id} onChange={(e) => {
              const inst = pendingInstallments.find((i) => i.id === e.target.value);
              setForm({ ...form, installment_id: e.target.value, amount: inst ? String(parseFloat(inst.due_amount) - parseFloat(inst.paid_amount)) : form.amount });
            }}>
              <option value="">Select an installment…</option>
              {pendingInstallments.map((i) => (
                <option key={i.id} value={i.id}>{i.customer_name} — {i.group_code} Cycle {i.cycle_number} ({formatCurrency(i.due_amount)})</option>
              ))}
            </Select>
          </div>
          <div><Label htmlFor="amount">Amount (₹)</Label><Input id="amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div>
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option>
            </Select>
          </div>
          <div><Label htmlFor="reference_number">Reference number</Label><Input id="reference_number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!reverseTarget} onClose={() => setReverseTarget(null)} title="Reverse Payment" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Reversing this {formatCurrency(reverseTarget?.amount)} payment will restore the installment balance. This cannot be undone.
          </p>
          <div>
            <Label htmlFor="reverse_reason">Reason for reversal</Label>
            <Textarea id="reverse_reason" rows={2} required value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="e.g. Entered against the wrong installment" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setReverseTarget(null)} disabled={reversing}>Cancel</Button>
            <Button variant="danger" onClick={handleReverse} loading={reversing} disabled={!reverseReason.trim()}>Reverse Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
