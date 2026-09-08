"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Form";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import type { Customer } from "@/lib/types";

interface FormState {
  full_name: string;
  phone: string;
  email: string;
  city: string;
}
const emptyForm: FormState = { full_name: "", phone: "", email: "", city: "" };

export default function CustomersPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Customer>("/customers");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/customers", { ...form, email: form.email || undefined, city: form.city || undefined });
      showToast("Customer created.");
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
      await api.delete(`/customers/${deleteTarget.id}`);
      showToast("Customer deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete customer.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Customer>[] = [
    { key: "full_name", header: "Name", sortable: true, render: (c) => <span className="font-medium text-slate-800">{c.full_name}</span> },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    { key: "city", header: "City", render: (c) => c.city ?? "—" },
    { key: "branch_name", header: "Branch", render: (c) => c.branch_name ?? "—" },
    { key: "kyc_status", header: "KYC", sortable: true, render: (c) => <StatusBadge status={c.kyc_status} /> },
    { key: "assigned_staff_name", header: "Assigned To", render: (c) => c.assigned_staff_name ?? "—" },
    {
      key: "actions", header: "", className: "text-right",
      render: (c) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {can("customers", "delete") && (
            <button className="rounded-md p-1.5 text-slate-400 hover:bg-danger-bg hover:text-danger cursor-pointer" onClick={() => setDeleteTarget(c)}>
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
        title="Customers"
        subtitle="Everyone who has joined a chit scheme, with full profile and payment history."
        action={can("customers", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Customer</Button>}
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
          emptyTitle="No customers found"
          onRowClick={(c) => router.push(`/customers/${c.id}`)}
          getRowKey={(c) => c.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Customer">
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
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Customer</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete customer?"
        message={`This will remove "${deleteTarget?.full_name}" and their profile. Chit memberships and payment history are preserved for audit purposes.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
