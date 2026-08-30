import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { KPICard } from "../../components/ui/KPICard";
import { StatusPill, pillClassNameForStatus } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { ContactActions } from "../../components/ui/ContactActions";
import { LeadDetailDrawer } from "../../components/crm/LeadDetailDrawer";
import { Field, Select, TextInput, Textarea } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { nextNumber } from "../../lib/numbering";
import { formatCurrency, formatDate } from "../../lib/format";
import { convertLeadToClient } from "../../lib/cascades";
import { notifyNewLead } from "../../lib/notifications";
import { isValidEmail, isValidPhone } from "../../lib/contact";
import { toast } from "../../components/ui/Toast";
import type { Lead, LeadSource, LeadStatus } from "../../types";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Outreach", "Social", "Ads", "Event", "Other"];
const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Follow-up", "Negotiation", "Hot", "Qualified", "Unqualified", "Won", "Lost", "Converted"];

const emptyForm = {
  name: "",
  company_name: "",
  whatsapp: "",
  phone: "",
  requirement: "",
  estimated_value: "",
  email: "",
  website: "",
  location: "",
  source: "Website" as LeadSource,
  score: 50,
  next_follow_up: "",
  assigned_to: "",
  notes: "",
};

export default function LeadsList() {
  const { leads, users, company, addEntity, updateEntity, logActivity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [modalOpen, setModalOpen] = useState(false);
  const [moreDetails, setMoreDetails] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (requestedCreate === "lead") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  // Keyboard shortcut: "n" opens New Lead (spec Section 17), ignored while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!typing && e.key.toLowerCase() === "n" && !modalOpen) {
        setModalOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
  const hotLeads = leads.filter((l) => l.score >= 70).length;
  const converted = leads.filter((l) => l.status === "Converted").length;
  const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;

  function closeModal() {
    setModalOpen(false);
    setMoreDetails(false);
    setForm(emptyForm);
  }

  function handleCreate() {
    if (!form.name || !form.company_name) {
      toast.error("Lead name and business name are required");
      return;
    }
    if (!isValidPhone(form.whatsapp) || !isValidPhone(form.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const lead: Lead = {
      id: newId(),
      company_id: company.id,
      lead_number: nextNumber("LEAD", leads.map((l) => l.lead_number)),
      name: form.name,
      company_name: form.company_name,
      email: form.email,
      phone: form.phone || form.whatsapp,
      whatsapp: form.whatsapp || form.phone,
      requirement: form.requirement,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      website: form.website,
      location: form.location,
      source: form.source,
      score: form.score,
      status: "New",
      assigned_to: form.assigned_to || undefined,
      next_follow_up: form.next_follow_up ? new Date(form.next_follow_up).toISOString() : null,
      notes: form.notes,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("leads", lead);
    logActivity({ entity_type: "Lead", entity_id: lead.id, summary: `New lead added: ${lead.name} (${lead.company_name})` });
    notifyNewLead(lead);
    toast.success("Lead added");
    closeModal();
  }

  function handleConvert(lead: Lead) {
    convertLeadToClient(lead.id);
    toast.success(`${lead.company_name} converted to client — client, contact, and deal created`);
    setConvertLead(null);
    setDrawerLeadId(null);
  }

  const columns: Column<Lead>[] = [
    {
      key: "lead_number",
      label: "Lead ID",
      width: "w-24",
      hideOnMobile: true,
      sortValue: (r) => r.lead_number || "",
      render: (r) => <span className="text-xs font-mono text-on-surface-variant">{r.lead_number || "—"}</span>,
    },
    {
      key: "name",
      label: "Contact",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <div className="font-semibold text-on-surface">{r.name}</div>
          <div className="text-xs text-on-surface-variant md:hidden">
            {r.lead_number ? `${r.lead_number} · ` : ""}
            {r.company_name}
          </div>
        </div>
      ),
    },
    { key: "company", label: "Business", sortValue: (r) => r.company_name, hideOnMobile: true, render: (r) => r.company_name },
    {
      key: "requirement",
      label: "Requirement",
      hideOnMobile: true,
      render: (r) => <span className="truncate text-on-surface-variant">{r.requirement || "—"}</span>,
    },
    {
      key: "value",
      label: "Est. Value",
      width: "w-28",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.estimated_value || 0,
      render: (r) => (r.estimated_value ? formatCurrency(r.estimated_value, company.currency) : "—"),
    },
    {
      key: "status",
      label: "Status",
      width: "w-36",
      align: "center",
      render: (r) => (
        <select
          value={r.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const status = e.target.value as LeadStatus;
            updateEntity<Lead>("leads", r.id, { status });
            logActivity({ entity_type: "Lead", entity_id: r.id, summary: `${r.name}'s status changed to ${status}` });
            toast.success("Lead updated successfully");
          }}
          className={`w-full text-[12px] font-semibold leading-none rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${pillClassNameForStatus(
            r.status
          )}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "followup",
      label: "Follow-up",
      hideOnMobile: true,
      render: (r) => <FollowUpBadge iso={r.next_follow_up} />,
    },
    {
      key: "actions",
      label: "",
      width: "w-48",
      align: "right",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <ContactActions whatsapp={r.whatsapp || r.phone} phone={r.phone} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawerLeadId(r.id);
            }}
            title="Edit"
            aria-label="Edit lead"
            className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0"
          >
            <Icon name="edit" size={16} />
          </button>
          {r.status !== "Converted" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConvertLead(r);
              }}
              className="text-primary text-xs font-bold hover:underline flex-shrink-0"
            >
              Convert
            </button>
          ) : (
            <span className="text-xs text-on-surface-variant flex-shrink-0">Converted</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Leads"
        subtitle="Enter a lead once — WhatsApp, call, edit, and convert without retyping anything."
        right={
          <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
            New Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Total Leads" value={leads.length} hasData={leads.length > 0} height={100} />
        <KPICard label="New Leads (This Month)" value={newThisMonth} hasData={leads.length > 0} height={100} />
        <KPICard label="Hot Leads" value={hotLeads} hasData={leads.length > 0} height={100} />
        <KPICard label="Conversion Rate %" value={`${conversionRate}%`} hasData={leads.length > 0} height={100} />
      </div>

      <DataTable
        columns={columns}
        rows={leads}
        onRowClick={(r) => setDrawerLeadId(r.id)}
        searchFields={(r) => `${r.lead_number} ${r.name} ${r.company_name} ${r.email} ${r.phone} ${r.whatsapp ?? ""} ${r.source} ${r.status} ${r.requirement ?? ""}`}
        exportFilename="leads"
        exportMapper={(r) => ({
          "Lead ID": r.lead_number,
          Name: r.name,
          Business: r.company_name,
          WhatsApp: r.whatsapp,
          Phone: r.phone,
          Requirement: r.requirement,
          "Est. Value": r.estimated_value,
          Source: r.source,
          Score: r.score,
          Status: r.status,
        })}
        renderMobileCard={(r) => (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-on-surface-variant">{r.lead_number || "—"}</span>
              <select
                value={r.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const status = e.target.value as LeadStatus;
                  updateEntity<Lead>("leads", r.id, { status });
                  logActivity({ entity_type: "Lead", entity_id: r.id, summary: `${r.name}'s status changed to ${status}` });
                  toast.success("Lead updated successfully");
                }}
                className={`text-[11px] font-semibold leading-none rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${pillClassNameForStatus(r.status)}`}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="font-semibold text-on-surface truncate">{r.name}</div>
                <div className="text-xs text-on-surface-variant truncate">{r.company_name}</div>
              </div>
              {r.estimated_value != null && (
                <div className="text-primary font-bold text-body-sm flex-shrink-0">{formatCurrency(r.estimated_value, company.currency)}</div>
              )}
            </div>
            {r.requirement && <p className="text-xs text-on-surface-variant truncate mb-2">{r.requirement}</p>}
            <div className="flex items-center justify-between border-t border-outline-variant/60 pt-2 mt-2">
              <div className="text-xs text-on-surface-variant flex items-center gap-1">
                <Icon name="event" size={14} />
                <FollowUpBadge iso={r.next_follow_up} />
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <ContactActions whatsapp={r.whatsapp || r.phone} phone={r.phone} />
                <button
                  onClick={() => setDrawerLeadId(r.id)}
                  className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0"
                  title="View"
                >
                  <Icon name="visibility" size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        emptyState={{
          icon: "group_add",
          title: "No leads yet",
          description: "Start by adding your first lead.",
          actionLabel: "+ Add Lead",
          onAction: () => setModalOpen(true),
        }}
        height={560}
      />

      {/* New Lead — progressive disclosure form (spec Section 2) */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New Lead"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Save Lead
            </Button>
          </>
        }
      >
        <Field label="Lead Name / Contact Person" required>
          <TextInput autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Meera Kapoor" />
        </Field>
        <Field label="Business / Company Name" required>
          <TextInput value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Solstice Interiors" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp Number">
            <TextInput type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 98123 40000" />
          </Field>
          <Field label="Phone Number">
            <TextInput type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98123 40000" />
          </Field>
        </div>
        <Field label="Business Requirement">
          <Textarea value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="Need a modern ecommerce website with payment gateway, WhatsApp integration and SEO." rows={2} />
        </Field>
        <Field label="Estimated Project Value (₹)">
          <TextInput type="number" min={0} value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} placeholder="75000" />
        </Field>

        {!moreDetails ? (
          <button onClick={() => setMoreDetails(true)} className="text-primary font-label-bold text-label-bold hover:underline mb-2 flex items-center gap-1">
            <Icon name="add" size={16} /> More Details
          </button>
        ) : (
          <div className="space-y-4 border-t border-outline-variant pt-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
              </Field>
              <Field label="Website">
                <TextInput value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="company.com" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location">
                <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mumbai, IN" />
              </Field>
              <Field label="Lead Source">
                <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead Score (0-100)">
                <TextInput type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} />
              </Field>
              <Field label="Next Follow-up">
                <TextInput type="date" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
              </Field>
            </div>
            <Field label="Assigned Team Member">
              <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Convert Lead confirmation — reuses existing data, never re-asks (spec Section 10) */}
      <Modal
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
        title="Convert Lead?"
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertLead(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => convertLead && handleConvert(convertLead)}>
              Convert to Client
            </Button>
          </>
        }
      >
        {convertLead && (
          <div className="space-y-3 text-body-sm font-body-sm">
            <div>
              <div className="font-semibold text-on-surface text-headline-md font-headline-md">{convertLead.name}</div>
              <div className="text-on-surface-variant">{convertLead.company_name}</div>
            </div>
            {convertLead.requirement && (
              <div>
                <div className="text-label-sm font-label-sm text-on-surface-variant">Requirement</div>
                <div className="text-on-surface">{convertLead.requirement}</div>
              </div>
            )}
            <div>
              <div className="text-label-sm font-label-sm text-on-surface-variant">Estimated Value</div>
              <div className="text-on-surface font-semibold">{convertLead.estimated_value ? formatCurrency(convertLead.estimated_value, company.currency) : "—"}</div>
            </div>
            <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
              This creates a Client, Contact, and Deal automatically — reusing everything already entered on this lead.
            </p>
          </div>
        )}
      </Modal>

      <LeadDetailDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onRequestConvert={(lead) => setConvertLead(lead)}
      />
    </AppShell>
  );
}

function FollowUpBadge({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-outline">—</span>;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return <StatusPill label="Overdue" tone="overdue" />;
  if (diffDays === 0) return <StatusPill label="Today" tone="warning" />;
  if (diffDays === 1) return <span className="text-on-surface-variant">Tomorrow</span>;
  return <span className="text-on-surface-variant">{formatDate(iso)}</span>;
}

export type { LeadStatus, LeadSource } from "../../types";
