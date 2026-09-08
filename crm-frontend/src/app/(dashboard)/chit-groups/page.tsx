"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ChitGroup, ChitScheme, Branch, ListResponse } from "@/lib/types";

interface FormState { scheme_id: string; branch_id: string; group_code: string; start_date: string; end_date: string; }
const emptyForm: FormState = { scheme_id: "", branch_id: "", group_code: "", start_date: "", end_date: "" };

export default function ChitGroupsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<ChitGroup>("/chit-groups");

  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    api.get<ListResponse<ChitScheme>>("/chit-schemes", { pageSize: 100 }).then((r) => setSchemes(r.data)).catch(() => {});
    api.get<ListResponse<Branch>>("/branches", { pageSize: 100 }).then((r) => setBranches(r.data)).catch(() => setBranches([]));
  }, [modalOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/chit-groups", form);
      showToast("Chit group created.");
      setModalOpen(false);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ChitGroup>[] = [
    { key: "group_code", header: "Group Code", sortable: true, render: (g) => <span className="font-medium text-slate-800">{g.group_code}</span> },
    { key: "scheme_name", header: "Scheme", render: (g) => g.scheme_name },
    { key: "branch_name", header: "Branch", render: (g) => g.branch_name },
    { key: "chit_amount", header: "Amount", render: (g) => formatCurrency(g.chit_amount) },
    { key: "current_cycle", header: "Cycle", render: (g) => `${g.current_cycle} / ${g.member_count}` },
    { key: "start_date", header: "Start Date", sortable: true, render: (g) => formatDate(g.start_date) },
    { key: "status", header: "Status", sortable: true, render: (g) => <StatusBadge status={g.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Chit Groups"
        subtitle="Running batches of members subscribing together against a scheme."
        action={can("chit_groups", "write") && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Create Chit Group</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search by group code…" emptyTitle="No chit groups yet"
          onRowClick={(g) => router.push(`/chit-members?chitGroupId=${g.id}`)}
          getRowKey={(g) => g.id}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Chit Group">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="scheme_id">Scheme</Label>
            <Select id="scheme_id" required value={form.scheme_id} onChange={(e) => setForm({ ...form, scheme_id: e.target.value })}>
              <option value="">Select a scheme…</option>
              {schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="branch_id">Branch</Label>
            <Select id="branch_id" required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">Select a branch…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="group_code">Group code</Label><Input id="group_code" required placeholder="GOLD-A1-2026-04" value={form.group_code} onChange={(e) => setForm({ ...form, group_code: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="start_date">Start date</Label><Input id="start_date" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label htmlFor="end_date">End date</Label><Input id="end_date" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          {formError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Group</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
