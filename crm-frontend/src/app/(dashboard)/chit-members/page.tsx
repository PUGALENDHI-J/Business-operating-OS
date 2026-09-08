"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import type { ChitMember, Customer, ChitGroup, ListResponse } from "@/lib/types";

interface FormState { chit_group_id: string; customer_id: string; member_serial_no: string; }

function ChitMembersInner() {
  const searchParams = useSearchParams();
  const groupFilter = searchParams.get("chitGroupId") ?? undefined;
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<ChitMember>("/chit-members", {
    chitGroupId: groupFilter,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ chit_group_id: groupFilter ?? "", customer_id: "", member_serial_no: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    api.get<ListResponse<Customer>>("/customers", { pageSize: 100 }).then((r) => setCustomers(r.data)).catch(() => {});
    api.get<ListResponse<ChitGroup>>("/chit-groups", { pageSize: 100 }).then((r) => setGroups(r.data)).catch(() => {});
  }, [modalOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/chit-members", { ...form, member_serial_no: Number(form.member_serial_no) });
      showToast("Member added — installment schedule generated automatically.");
      setModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ChitMember>[] = [
    { key: "customer_name", header: "Customer", sortable: true, render: (m) => <span className="font-medium text-slate-800">{m.customer_name}</span> },
    { key: "customer_phone", header: "Phone", render: (m) => m.customer_phone },
    { key: "group_code", header: "Group", render: (m) => m.group_code },
    { key: "scheme_name", header: "Scheme", render: (m) => m.scheme_name },
    { key: "member_serial_no", header: "Serial #", render: (m) => m.member_serial_no },
    { key: "join_date", header: "Joined", sortable: true, render: (m) => formatDate(m.join_date) },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Chit Members"
        subtitle="Customers enrolled in a chit group, with auto-generated installment schedules."
        action={can("chit_members", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Member</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search by customer name or phone…" emptyTitle="No members in this view"
          getRowKey={(m) => m.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Chit Member">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="chit_group_id">Chit group</Label>
            <Select id="chit_group_id" required value={form.chit_group_id} onChange={(e) => setForm({ ...form, chit_group_id: e.target.value })}>
              <option value="">Select a group…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.group_code} — {g.scheme_name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="customer_id">Customer</Label>
            <Select id="customer_id" required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select a customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="member_serial_no">Serial number</Label><Input id="member_serial_no" type="number" required min={1} value={form.member_serial_no} onChange={(e) => setForm({ ...form, member_serial_no: e.target.value })} /></div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ChitMembersPage() {
  return (
    <Suspense>
      <ChitMembersInner />
    </Suspense>
  );
}
