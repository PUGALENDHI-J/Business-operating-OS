import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
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
import { toast } from "../../components/ui/Toast";
import type { Proposal } from "../../types";


export default function ProposalsList() {
  const { proposals, clients, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_id: "", amount: 0 });

  useEffect(() => {
    if (requestedCreate === "proposal") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const sentCount = proposals.filter((p) => p.status === "Sent").length;
  const acceptedValue = proposals.filter((p) => p.status === "Accepted").reduce((s, p) => s + p.amount, 0);
  const winRate =
    proposals.filter((p) => p.status === "Accepted" || p.status === "Rejected").length > 0
      ? Math.round(
          (proposals.filter((p) => p.status === "Accepted").length / proposals.filter((p) => p.status === "Accepted" || p.status === "Rejected").length) * 100
        )
      : 0;

  function handleCreate() {
    if (!form.title || !form.client_id) {
      toast.error("Title and client are required");
      return;
    }
    const proposal: Proposal = {
      id: newId(),
      company_id: company.id,
      proposal_number: `PRP-${Math.floor(1000 + Math.random() * 9000)}`,
      client_id: form.client_id,
      title: form.title,
      amount: form.amount,
      status: "Draft",
      issue_date: nowIso(),
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("proposals", proposal);
    toast.success("Proposal created");
    setModalOpen(false);
    setForm({ title: "", client_id: "", amount: 0 });
  }

  const columns: Column<Proposal>[] = [
    { key: "number", label: "Proposal #", width: "w-32", render: (r) => <span className="font-semibold">{r.proposal_number}</span> },
    {
      key: "title",
      label: "Title",
      sortValue: (r) => r.title,
      render: (r) => (
        <div>
          <div className="font-medium text-on-surface">{r.title}</div>
          <div className="text-xs text-on-surface-variant md:hidden">{clients.find((c) => c.id === r.client_id)?.name}</div>
        </div>
      ),
    },
    { key: "client", label: "Client", hideOnMobile: true, render: (r) => clients.find((c) => c.id === r.client_id)?.name ?? "—" },
    { key: "issue", label: "Issue Date", hideOnMobile: true, render: (r) => formatDate(r.issue_date) },
    { key: "valid", label: "Valid Until", hideOnMobile: true, render: (r) => formatDate(r.valid_until) },
    { key: "amount", label: "Amount", align: "right", sortValue: (r) => r.amount, render: (r) => <span className="font-semibold">{formatCurrency(r.amount, company.currency)}</span> },
    { key: "status", label: "Status", width: "w-28", align: "center", render: (r) => <StatusPill label={r.status} /> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Proposals"
        right={
          <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
            New Proposal
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <KPICard label="Total Proposals" value={proposals.length} hasData={proposals.length > 0} height={100} />
        <KPICard label="Awaiting Response" value={sentCount} hasData={proposals.length > 0} height={100} />
        <KPICard label="Accepted Value" value={formatCurrency(acceptedValue, company.currency)} hasData={acceptedValue > 0} height={100} trend={winRate > 0 ? { direction: "up", label: `${winRate}% win rate` } : undefined} />
      </div>

      <DataTable
        columns={columns}
        rows={proposals}
        searchFields={(r) => `${r.title} ${r.proposal_number}`}
        exportFilename="proposals"
        exportMapper={(r) => ({ Number: r.proposal_number, Title: r.title, Amount: r.amount, Status: r.status })}
        emptyState={{
          icon: "description",
          title: "No proposals yet",
          description: "Send your first proposal to start tracking client responses.",
          actionLabel: "+ New Proposal",
          onAction: () => setModalOpen(true),
        }}
        height={480}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Proposal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Create Proposal
            </Button>
          </>
        }
      >
        <Field label="Title" required>
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Q3 Growth Retainer" />
        </Field>
        <Field label="Client" required>
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount">
          <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </Field>
      </Modal>
    </AppShell>
  );
}
