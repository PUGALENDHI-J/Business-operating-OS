import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { KPICard } from "../../components/ui/KPICard";
import { KanbanBoard, type KanbanColumnDef } from "../../components/ui/KanbanBoard";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { ContactActions } from "../../components/ui/ContactActions";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { useNavigate } from "react-router-dom";
import { calculatePipelineValue, calculateWeightedPipeline, calculateWinRate } from "../../lib/calculations";
import { formatCurrency } from "../../lib/format";
import { newId, nowIso } from "../../lib/id";
import { markDealWon } from "../../lib/cascades";
import { toast } from "../../components/ui/Toast";
import { DEAL_STAGES, type Deal, type DealStage } from "../../types";

const COLUMNS: KanbanColumnDef[] = [
  { key: "New", label: "New" },
  { key: "Qualified", label: "Qualified" },
  { key: "Meeting", label: "Meeting" },
  { key: "Proposal", label: "Proposal" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won", tone: "won" },
  { key: "Lost", label: "Lost", tone: "lost" },
];

export default function DealsPipeline() {
  const { deals, clients, company, addEntity } = useStore();
  const navigate = useNavigate();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_id: "", value: 0, probability: 40 });

  useEffect(() => {
    if (requestedCreate === "deal") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const itemsByColumn = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const stage of DEAL_STAGES) map[stage] = deals.filter((d) => d.stage === stage);
    return map;
  }, [deals]);

  function handleMove(dealId: string, toStage: string) {
    if (toStage === "Won") {
      markDealWon(dealId);
      toast.success("Deal marked Won — project, starter tasks, and a draft invoice were created");
      return;
    }
    useStore.getState().updateEntity<Deal>("deals", dealId, { stage: toStage as DealStage });
  }

  function handleCreate() {
    if (!form.title || !form.client_id) {
      toast.error("Deal title and client are required");
      return;
    }
    const deal: Deal = {
      id: newId(),
      company_id: company.id,
      title: form.title,
      client_id: form.client_id,
      value: form.value,
      probability: form.probability,
      stage: "New",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("deals", deal);
    toast.success("Deal added to pipeline");
    setModalOpen(false);
    setForm({ title: "", client_id: "", value: 0, probability: 40 });
  }

  const openDeals = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost").length;

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        <div className="space-y-stack-lg flex-shrink-0">
          <PageHeader
            title="Pipeline Management"
            subtitle="Drag and drop leads to update their status."
            right={
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" icon={<Icon name="filter_list" size={16} />}>
                  Filter
                </Button>
                <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
                  New Deal
                </Button>
              </div>
            }
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
            <KPICard label="Total Pipeline Value" value={formatCurrency(calculatePipelineValue(deals), company.currency)} hasData={deals.length > 0} height={100} />
            <KPICard label="Weighted Pipeline" value={formatCurrency(calculateWeightedPipeline(deals), company.currency)} hasData={deals.length > 0} height={100} />
            <KPICard label="Open Deals" value={openDeals} hasData={deals.length > 0} height={100} />
            <KPICard label="Win Rate %" value={`${Math.round(calculateWinRate(deals))}%`} hasData={deals.some((d) => d.stage === "Won" || d.stage === "Lost")} height={100} />
          </div>
        </div>

        <div className="flex-1 min-h-0 mt-gutter">
          <KanbanBoard<Deal>
            columns={COLUMNS}
            itemsByColumn={itemsByColumn}
            onMove={handleMove}
            emptyLabel="Your pipeline is empty. Create a deal to get started."
            renderCard={(deal) => {
              const client = clients.find((c) => c.id === deal.client_id);
              return (
                <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-3 shadow-soft hover:shadow-soft-hover transition-shadow">
                  <div className="font-semibold text-body-sm text-on-surface mb-1">{deal.title}</div>
                  <div className="text-xs text-on-surface-variant mb-2">{client?.name ?? "No client linked"}</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-body-sm text-primary">{formatCurrency(deal.value, company.currency)}</span>
                    <span className="text-xs text-on-surface-variant">{deal.probability}%</span>
                  </div>
                  {client && (client.whatsapp || client.phone) && (
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60" onClick={(e) => e.stopPropagation()}>
                      <ContactActions whatsapp={client.whatsapp || client.phone} phone={client.phone} />
                      <button
                        onClick={() => navigate(`/crm/clients/${client.id}`)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Deal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Add Deal
            </Button>
          </>
        }
      >
        <Field label="Deal Title" required>
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Northwind — Growth Retainer" />
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deal Value">
            <TextInput type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </Field>
          <Field label="Probability %">
            <TextInput type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
