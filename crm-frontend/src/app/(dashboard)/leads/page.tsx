"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Form";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

interface LeadFormState {
  full_name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
}

const emptyForm: LeadFormState = { full_name: "", phone: "", email: "", source: "", notes: "" };

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "");
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Lead>("/leads", {
    status: statusFilter || undefined,
  });

  const [modalOpen, setModalOpen] = useState(searchParams.get("new") === "1");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setParams({ status: statusFilter || undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ full_name: lead.full_name, phone: lead.phone, email: lead.email ?? "", source: lead.source ?? "", notes: lead.notes ?? "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        source: form.source || undefined,
        notes: form.notes || undefined,
      };
      if (editingLead) {
        await api.patch(`/leads/${editingLead.id}`, payload);
        showToast("Lead updated.");
      } else {
        await api.post("/leads", payload);
        showToast("Lead created.");
      }
      setModalOpen(false);
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
      await api.delete(`/leads/${deleteTarget.id}`);
      showToast("Lead deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete lead.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Lead>[] = [
    { key: "full_name", header: "Name", sortable: true, render: (l) => <span className="font-medium text-slate-800">{l.full_name}</span> },
    { key: "phone", header: "Phone", render: (l) => l.phone },
    { key: "interested_scheme_name", header: "Scheme", render: (l) => l.interested_scheme_name ?? "—" },
    { key: "status", header: "Status", sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    { key: "assigned_staff_name", header: "Assigned To", render: (l) => l.assigned_staff_name ?? "—" },
    { key: "created_at", header: "Created On", sortable: true, render: (l) => formatDate(l.created_at) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (l) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {can("leads", "write") && (
            <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer" onClick={() => openEdit(l)}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {can("leads", "delete") && (
            <button className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer" onClick={() => setDeleteTarget(l)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Enquiries and prospects moving through the sales pipeline."
        action={can("leads", "write") && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Lead</Button>}
      />

      <Card>
        <DataTable
          columns={columns}
          data={data}
          meta={meta}
          loading={loading}
          error={error}
          params={params}
          setParams={setParams}
          onRetry={refetch}
          searchPlaceholder="Search by name or phone…"
          emptyTitle="No leads found"
          emptyDescription="Leads submitted through the website or added manually will show up here."
          onRowClick={(l) => router.push(`/leads/${l.id}`)}
          getRowKey={(l) => l.id}
          toolbarExtra={
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          }
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? "Edit Lead" : "Add Lead"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Input id="source" placeholder="website, walk_in, referral…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingLead ? "Save Changes" : "Create Lead"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete lead?"
        message={`This will remove "${deleteTarget?.full_name}" from the pipeline. This can't be undone from here.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsPageInner />
    </Suspense>
  );
}
