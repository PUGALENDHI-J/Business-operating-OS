"use client";

import { useState, FormEvent, useEffect } from "react";
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
import type { Staff, Branch, ListResponse } from "@/lib/types";

interface FormState {
  full_name: string; phone: string; email: string; password: string;
  branch_id: string; employee_code: string; designation: string; role_id: string;
}
const emptyForm: FormState = { full_name: "", phone: "", email: "", password: "", branch_id: "", employee_code: "", designation: "", role_id: "" };

// The six roles named in the project brief. Fetched dynamically below where
// possible; this list is only a fallback label set for the dropdown before
// the real /staff form data has loaded.
export default function StaffPage() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Staff>("/staff");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    api.get<ListResponse<Branch>>("/branches", { pageSize: 100 }).then((r) => setBranches(r.data)).catch(() => setBranches([]));
  }, [modalOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/staff", {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        branch_id: form.branch_id,
        employee_code: form.employee_code || undefined,
        designation: form.designation || undefined,
        role_ids: [form.role_id],
      });
      showToast("Staff member created.");
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
      await api.delete(`/staff/${deleteTarget.id}`);
      showToast("Staff member deactivated.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to deactivate staff member.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Staff>[] = [
    { key: "full_name", header: "Name", sortable: true, render: (s) => <span className="font-medium text-slate-800">{s.full_name}</span> },
    { key: "phone", header: "Phone", render: (s) => s.phone },
    { key: "employee_code", header: "Employee Code", render: (s) => s.employee_code ?? "—" },
    { key: "designation", header: "Designation", render: (s) => s.designation ?? "—" },
    { key: "branch_name", header: "Branch", render: (s) => s.branch_name },
    { key: "is_active", header: "Status", render: (s) => <Badge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (s) => can("staff", "delete") && s.is_active && (
        <button className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer" onClick={() => setDeleteTarget(s)}>
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Team members with CRM logins, roles, and branch assignments."
        action={can("staff", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Staff</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search by name, phone, or employee code…" emptyTitle="No staff members yet"
          getRowKey={(s) => s.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label htmlFor="phone">Phone</Label><Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label htmlFor="password">Temporary password</Label><Input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label htmlFor="branch_id">Branch</Label>
            <Select id="branch_id" required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">Select a branch…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="employee_code">Employee code</Label><Input id="employee_code" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></div>
          <div><Label htmlFor="designation">Designation</Label><Input id="designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          <div>
            <Label htmlFor="role_id">Role (role ID)</Label>
            <Input id="role_id" required placeholder="Paste the role UUID from Settings → Roles" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} />
            <p className="mt-1 text-xs text-muted">Role assignment currently requires the role&apos;s ID — a friendly role picker needs a dedicated `/roles` list endpoint, which isn&apos;t part of the Phase 3 API yet.</p>
          </div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Staff</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Deactivate staff member?" message={`"${deleteTarget?.full_name}" will lose CRM access. This can be reversed by an admin later.`}
        confirmLabel="Deactivate" variant="danger" loading={deleting}
      />
    </div>
  );
}
