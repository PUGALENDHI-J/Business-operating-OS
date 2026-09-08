"use client";

import { useState, FormEvent } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Form";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import type { Branch } from "@/lib/types";

interface FormState { name: string; code: string; city: string; state: string; phone: string; }
const emptyForm: FormState = { name: "", code: "", city: "", state: "", phone: "" };

export default function BranchesPage() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Branch>("/branches");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(null); setModalOpen(true); };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ name: b.name, code: b.code, city: b.city ?? "", state: b.state ?? "", phone: b.phone ?? "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, city: form.city || undefined, state: form.state || undefined, phone: form.phone || undefined };
      if (editing) {
        await api.patch(`/branches/${editing.id}`, payload);
        showToast("Branch updated.");
      } else {
        await api.post("/branches", payload);
        showToast("Branch created.");
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
      await api.delete(`/branches/${deleteTarget.id}`);
      showToast("Branch deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete branch.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Branch>[] = [
    { key: "name", header: "Name", sortable: true, render: (b) => <span className="font-medium text-slate-800">{b.name}</span> },
    { key: "code", header: "Code", sortable: true, render: (b) => b.code },
    { key: "city", header: "City", render: (b) => b.city ?? "—" },
    { key: "phone", header: "Phone", render: (b) => b.phone ?? "—" },
    { key: "is_active", header: "Status", render: (b) => <Badge tone={b.is_active ? "success" : "neutral"}>{b.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (b) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {can("branches", "write") && (
            <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer" onClick={() => openEdit(b)}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {can("branches", "delete") && (
            <button className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer" onClick={() => setDeleteTarget(b)}>
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
        title="Branches"
        subtitle="Physical locations the business operates from."
        action={can("branches", "write") && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Branch</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search branches…" emptyTitle="No branches yet" getRowKey={(b) => b.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Branch" : "Add Branch"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="code">Code</Label><Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label htmlFor="city">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label htmlFor="state">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create Branch"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete branch?" message={`"${deleteTarget?.name}" will be removed.`}
        confirmLabel="Delete" variant="danger" loading={deleting}
      />
    </div>
  );
}
