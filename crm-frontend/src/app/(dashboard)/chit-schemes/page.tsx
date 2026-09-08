"use client";

import { useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import { formatCurrency, titleCase } from "@/lib/utils";
import type { ChitScheme } from "@/lib/types";

interface FormState {
  name: string; scheme_code: string; chit_amount: string; member_count: string;
  duration_periods: string; frequency: "weekly" | "monthly"; installment_amount: string;
}
const emptyForm: FormState = { name: "", scheme_code: "", chit_amount: "", member_count: "", duration_periods: "", frequency: "monthly", installment_amount: "" };

export default function ChitSchemesPage() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<ChitScheme>("/chit-schemes");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChitScheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/chit-schemes", {
        name: form.name,
        scheme_code: form.scheme_code,
        chit_amount: Number(form.chit_amount),
        member_count: Number(form.member_count),
        duration_periods: Number(form.duration_periods),
        frequency: form.frequency,
        installment_amount: Number(form.installment_amount),
      });
      showToast("Chit scheme created.");
      setModalOpen(false);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/chit-schemes/${deleteTarget.id}`);
      showToast("Chit scheme deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete scheme.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ChitScheme>[] = [
    { key: "name", header: "Scheme", sortable: true, render: (s) => <span className="font-medium text-slate-800">{s.name}</span> },
    { key: "scheme_code", header: "Code", render: (s) => s.scheme_code },
    { key: "chit_amount", header: "Chit Amount", sortable: true, render: (s) => formatCurrency(s.chit_amount) },
    { key: "member_count", header: "Members", render: (s) => s.member_count },
    { key: "frequency", header: "Frequency", render: (s) => titleCase(s.frequency) },
    { key: "installment_amount", header: "Installment", render: (s) => formatCurrency(s.installment_amount) },
    { key: "is_active", header: "Status", render: (s) => <Badge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (s) => can("chit_schemes", "delete") && (
        <button className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer" onClick={() => setDeleteTarget(s)}>
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Chit Schemes"
        subtitle="The product catalogue — Silver, Gold, Diamond, Platinum and special schemes."
        action={can("chit_schemes", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Scheme</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search schemes…" emptyTitle="No chit schemes yet" getRowKey={(s) => s.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Chit Scheme">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="scheme_code">Scheme code</Label><Input id="scheme_code" required value={form.scheme_code} onChange={(e) => setForm({ ...form, scheme_code: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="member_count">Members</Label><Input id="member_count" type="number" required value={form.member_count} onChange={(e) => setForm({ ...form, member_count: e.target.value })} /></div>
            <div><Label htmlFor="duration_periods">Duration</Label><Input id="duration_periods" type="number" required value={form.duration_periods} onChange={(e) => setForm({ ...form, duration_periods: e.target.value })} /></div>
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as "weekly" | "monthly" })}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </div>
          <div><Label htmlFor="installment_amount">Installment amount (₹)</Label><Input id="installment_amount" type="number" required value={form.installment_amount} onChange={(e) => setForm({ ...form, installment_amount: e.target.value, chit_amount: e.target.value && form.member_count ? String(Number(e.target.value) * Number(form.member_count)) : form.chit_amount })} /></div>
          <div>
            <Label htmlFor="chit_amount">Chit amount (₹) — must equal installment × members</Label>
            <Input id="chit_amount" type="number" required value={form.chit_amount} onChange={(e) => setForm({ ...form, chit_amount: e.target.value })} />
          </div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Scheme</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete chit scheme?" message={`"${deleteTarget?.name}" will be removed from the active catalogue.`}
        confirmLabel="Delete" variant="danger" loading={deleting}
      />
    </div>
  );
}
