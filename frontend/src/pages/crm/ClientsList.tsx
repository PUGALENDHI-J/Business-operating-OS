import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { KPICard } from "../../components/ui/KPICard";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { ContactActions } from "../../components/ui/ContactActions";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { nextNumber } from "../../lib/numbering";
import { initials } from "../../lib/format";
import { calculateClientLifetimeValue, calculateClientFinancials } from "../../lib/calculations";
import { formatCurrency } from "../../lib/format";
import { toast } from "../../components/ui/Toast";
import type { Client, ClientStatus } from "../../types";

const STATUSES: ClientStatus[] = ["Active", "Inactive", "At Risk", "Advance Received", "Project Started", "In Progress", "Payment Due", "Completed"];

export default function ClientsList() {
  const navigate = useNavigate();
  const { clients, revenue, payments, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", whatsapp: "", phone: "", email: "", descriptor: "", location: "", website: "", status: "Active" as ClientStatus });

  useEffect(() => {
    if (requestedCreate === "client") {
      setModalOpen(true);
      clearRequestedCreate();
    } else if (requestedCreate === "payment" || requestedCreate === "followup") {
      toast.info(`Pick a client below to ${requestedCreate === "payment" ? "add a payment" : "schedule a follow-up"}`);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const active = clients.filter((c) => c.status === "Active").length;
  const atRisk = clients.filter((c) => c.status === "At Risk").length;
  const avgHealth = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length) : 0;

  function handleCreate() {
    if (!form.name) {
      toast.error("Client name is required");
      return;
    }
    const client: Client = {
      id: newId(),
      company_id: company.id,
      client_number: nextNumber("CLI", clients.map((c) => c.client_number)),
      name: form.name,
      logo_initial: initials(form.name).slice(0, 1) || "C",
      status: form.status,
      descriptor: form.descriptor,
      location: form.location || "—",
      website: form.website,
      contact_person: form.contact_person,
      whatsapp: form.whatsapp || form.phone,
      phone: form.phone,
      email: form.email,
      health_score: 60,
      advance_paid: 0,
      total_paid: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("clients", client);
    toast.success("Client added");
    setModalOpen(false);
    setForm({ name: "", contact_person: "", whatsapp: "", phone: "", email: "", descriptor: "", location: "", website: "", status: "Active" });
  }

  const columns: Column<Client>[] = [
    {
      key: "name",
      label: "Client",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{r.logo_initial}</div>
          <div className="min-w-0">
            <div className="font-semibold text-on-surface truncate">{r.name}</div>
            <div className="text-xs text-on-surface-variant truncate">{r.client_number || r.descriptor}</div>
          </div>
        </div>
      ),
    },
    { key: "descriptor", label: "Description", hideOnMobile: true, render: (r) => <span className="text-on-surface-variant truncate">{r.descriptor}</span> },
    { key: "location", label: "Location", hideOnMobile: true, render: (r) => r.location },
    {
      key: "ltv",
      label: "Lifetime Value",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => calculateClientLifetimeValue(r.id, revenue),
      render: (r) => formatCurrency(calculateClientLifetimeValue(r.id, revenue), company.currency),
    },
    { key: "status", label: "Status", width: "w-28", align: "center", render: (r) => <StatusPill label={r.status} /> },
    {
      key: "actions",
      label: "",
      width: "w-28",
      align: "right",
      render: (r) => <ContactActions whatsapp={r.whatsapp || r.phone} phone={r.phone} email={r.email} />,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Clients"
        right={
          <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
            Add Client
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Total Clients" value={clients.length} hasData={clients.length > 0} height={100} />
        <KPICard label="Active" value={active} hasData={clients.length > 0} height={100} />
        <KPICard label="At Risk" value={atRisk} hasData={clients.length > 0} height={100} alert={atRisk > 0} alertText={atRisk > 0 ? "Needs attention" : undefined} />
        <KPICard label="Avg Health Score" value={avgHealth} hasData={clients.length > 0} height={100} />
      </div>

      <DataTable
        columns={columns}
        rows={clients}
        onRowClick={(c) => navigate(`/crm/clients/${c.id}`)}
        searchFields={(r) => `${r.client_number ?? ""} ${r.name} ${r.descriptor} ${r.location} ${r.phone ?? ""} ${r.whatsapp ?? ""} ${r.email ?? ""}`}
        exportFilename="clients"
        exportMapper={(r) => ({ "Client ID": r.client_number, Name: r.name, Status: r.status, Location: r.location, "Health Score": r.health_score })}
        renderMobileCard={(r) => {
          const { projectValue, totalPaid, balanceDue } = calculateClientFinancials(r, payments);
          return (
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold text-on-surface truncate">{r.name}</div>
                  <div className="text-xs text-on-surface-variant truncate">{r.descriptor}</div>
                </div>
                <StatusPill label={r.status} className="flex-shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Total Project</div>
                  <div className="font-semibold text-on-surface text-body-sm">{formatCurrency(projectValue, company.currency)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Total Paid</div>
                  <div className="font-semibold text-status-success-text text-body-sm">{formatCurrency(totalPaid, company.currency)}</div>
                </div>
              </div>
              <div className="mb-3 pt-2 border-t border-outline-variant/60">
                <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Balance Due</div>
                <div className="font-bold text-primary text-body-lg">{formatCurrency(balanceDue, company.currency)}</div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {(r.whatsapp || r.phone) && (
                  <a
                    href={`https://wa.me/${(r.whatsapp || r.phone || "").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-sidebar text-on-sidebar font-label-bold text-label-sm"
                  >
                    <Icon name="chat" size={16} /> WhatsApp
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-sidebar text-on-sidebar font-label-bold text-label-sm">
                    <Icon name="call" size={16} /> Call
                  </a>
                )}
              </div>
            </div>
          );
        }}
        emptyState={{
          icon: "domain",
          title: "No clients yet",
          description: "Clients appear here once a lead is converted, or you can add one directly.",
          actionLabel: "+ Add your first client",
          onAction: () => setModalOpen(true),
        }}
        height={520}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Client"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Add Client
            </Button>
          </>
        }
      >
        <Field label="Client / Business Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Northwind Retail" />
        </Field>
        <Field label="Contact Person">
          <TextInput value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Priya Sharma" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp">
            <TextInput type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 98123 40000" />
          </Field>
          <Field label="Phone">
            <TextInput type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98123 40000" />
          </Field>
        </div>
        <Field label="Description">
          <TextInput value={form.descriptor} onChange={(e) => setForm({ ...form, descriptor: e.target.value })} placeholder="D2C fashion e-commerce brand" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mumbai, IN" />
          </Field>
          <Field label="Website">
            <TextInput value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
          </Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </AppShell>
  );
}
