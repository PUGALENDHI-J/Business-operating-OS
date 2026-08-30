import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { StatusPill, toneForStatus } from "../../components/ui/StatusPill";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { EditableField } from "../../components/ui/EditableField";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { toast } from "../../components/ui/Toast";
import { useStore } from "../../lib/store";
import { calculateClientFinancials } from "../../lib/calculations";
import { recordClientPayment } from "../../lib/cascades";
import { waLink, telLink } from "../../lib/contact";
import { formatCurrency, formatDate, formatDateShort } from "../../lib/format";
import type { Client, ClientStatus, Payment } from "../../types";

/** WhatsApp / Call button with a visible label, for the client-header hero row (spec Section 9). */
function HeroContactButton({ kind, value }: { kind: "whatsapp" | "call"; value?: string | null }) {
  const href = kind === "whatsapp" ? waLink(value) : telLink(value);
  if (!href) return null;
  const isWhatsapp = kind === "whatsapp";
  return (
    <a
      href={href}
      target={isWhatsapp ? "_blank" : undefined}
      rel={isWhatsapp ? "noreferrer" : undefined}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg font-label-bold text-label-bold border transition-colors ${
        isWhatsapp
          ? "border-tertiary text-tertiary hover:bg-tertiary/10"
          : "border-outline-variant text-on-surface hover:bg-surface-container-low"
      }`}
    >
      <Icon name={isWhatsapp ? "chat" : "call"} size={17} />
      {isWhatsapp ? "WhatsApp" : "Call"}
    </a>
  );
}

const PAYMENT_METHODS: Payment["method"][] = ["UPI", "Cash", "Bank Transfer", "Card", "Other"];

const STATUSES: ClientStatus[] = ["Active", "Inactive", "At Risk", "Advance Received", "Project Started", "In Progress", "Payment Due", "Completed"];

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, projects, payments, activities, company, updateEntity, logActivity } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; descriptor: string; status: ClientStatus } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "UPI" as Payment["method"], reference: "", notes: "" });

  const client = clients.find((c) => c.id === id);
  if (!client) {
    return (
      <AppShell>
        <EmptyState icon="domain" title="Client not found" description="This client may have been removed." actionLabel="Back to Clients" onAction={() => navigate("/crm/clients")} />
      </AppShell>
    );
  }

  function save<K extends keyof Client>(field: K, value: Client[K]) {
    updateEntity<Client>("clients", client!.id, { [field]: value } as Partial<Client>);
    logActivity({ entity_type: "Client", entity_id: client!.id, summary: `${client!.name}'s ${String(field).replace("_", " ")} updated` });
    toast.success("Client updated successfully");
  }

  const clientProjects = projects.filter((p) => p.client_id === client.id);

  // Financial summary — single source of truth: every payment ever recorded
  // against this client, never a manual calculation (spec Sections 16-19, 34).
  const clientPayments = payments.filter((p) => p.client_id === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const { projectValue, totalPaid, balanceDue, paidPercentage: paidPct } = calculateClientFinancials(client, payments);

  function openPaymentModal() {
    setPaymentForm({ amount: "", date: new Date().toISOString().slice(0, 10), method: "UPI", reference: "", notes: "" });
    setPaymentOpen(true);
  }

  function submitPayment() {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    recordClientPayment(client!.id, {
      amount,
      date: new Date(paymentForm.date).toISOString(),
      method: paymentForm.method,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
      projectId: clientProjects[0]?.id ?? null,
    });
    toast.success("Payment recorded successfully");
    setPaymentOpen(false);
  }

  // Activity Timeline (spec Section 17) — every event touching this client,
  // its projects, or its payments, newest first.
  const relevantIds = new Set<string>([client.id, ...clientProjects.map((p) => p.id), ...clientPayments.map((p) => p.id)]);
  const timeline = activities
    .filter((a) => relevantIds.has(a.entity_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <AppShell>
      <button
        onClick={() => navigate("/crm/clients")}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-label-bold text-label-sm uppercase tracking-wide transition-colors"
      >
        <Icon name="arrow_back" size={18} /> Back to Clients
      </button>

      {/* Client header — the single most important screen in the app (spec Section 9) */}
      <Card className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl flex-shrink-0">
            {client.logo_initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md text-on-surface truncate">{client.name}</h1>
              <StatusPill label={client.status} tone={toneForStatus(client.status)} />
            </div>
            <div className="flex items-center gap-3 text-body-sm font-body-sm text-on-surface-variant mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-xs font-semibold">{client.descriptor}</span>
              <span className="flex items-center gap-1">
                <Icon name="location_on" size={15} /> {client.location}
              </span>
              {client.client_number && <span className="text-xs text-outline">{client.client_number}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button
            onClick={() => {
              setEditForm({ name: client.name, descriptor: client.descriptor, status: client.status });
              setEditOpen(true);
            }}
            className="w-10 h-10 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
            title="Edit client"
          >
            <Icon name="edit" size={18} />
          </button>
          <HeroContactButton kind="whatsapp" value={client.whatsapp || client.phone} />
          <HeroContactButton kind="call" value={client.phone} />
          <Button variant="primary" onClick={openPaymentModal} icon={<Icon name="add" size={18} />}>
            Add Payment
          </Button>
        </div>
      </Card>

      {/* Financial Summary — the most important numbers (spec Sections 10-11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <Card>
          <div className="flex items-start justify-between">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Total Project Value</span>
            <Icon name="account_balance_wallet" size={18} className="text-on-surface-variant" />
          </div>
          <EditableField
            label=""
            value={projectValue ? String(projectValue) : ""}
            type="number"
            placeholder="150000"
            formatDisplay={(v) => formatCurrency(Number(v), company.currency)}
            validate={(v) => (v && Number(v) < 0 ? "Must be 0 or more" : null)}
            onSave={(v) => save("project_value", v ? Number(v) : undefined)}
          />
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Advance Paid</span>
            <Icon name="payments" size={18} className="text-on-surface-variant" />
          </div>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">{formatCurrency(client.advance_paid || 0, company.currency)}</p>
          {(client.advance_paid || 0) > 0 && <StatusPill label="Received" tone="success" className="mt-2" />}
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Total Paid</span>
            <Icon name="account_balance" size={18} className="text-on-surface-variant" />
          </div>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">{formatCurrency(totalPaid, company.currency)}</p>
        </Card>
        <Card className={balanceDue > 0 ? "border-primary/40 bg-primary-container/20" : ""}>
          <div className="flex items-start justify-between">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wide">Balance Due</span>
            {balanceDue > 0 && <Icon name="warning" size={18} className="text-primary" />}
          </div>
          <p className={`font-headline-md text-headline-md mt-1 ${balanceDue > 0 ? "text-primary" : "text-on-surface"}`}>
            {formatCurrency(balanceDue, company.currency)}
          </p>
        </Card>
      </div>

      {/* Requirement + Active Projects (left) / Payment Progress + History + Timeline (right) — spec Sections 12, 13, 15, 17, 47 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
        <div className="space-y-stack-lg">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-md text-headline-md flex items-center gap-2">
                <Icon name="description" size={20} className="text-on-surface-variant" /> Client Requirement
              </h3>
            </div>
            <EditableField
              label=""
              value={client.requirement || ""}
              type="textarea"
              placeholder="Client requires a comprehensive website with booking system, WhatsApp integration, SEO and admin panel."
              onSave={(v) => save("requirement", v)}
            />
          </Card>

          <Card padded={false}>
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-headline-md text-headline-md flex items-center gap-2">
                <Icon name="folder_open" size={20} className="text-on-surface-variant" /> Active Projects
              </h3>
              <button onClick={() => navigate("/operations/projects")} className="text-label-sm font-label-bold text-primary hover:underline uppercase">
                View All
              </button>
            </div>
            {clientProjects.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState icon="folder_open" title="No projects yet" description="Projects appear here once a deal is won." compact />
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {clientProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/operations/projects?open=${p.id}`)}
                    className="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-container-low transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <Icon name="apartment" size={20} className="text-on-surface-variant" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-body-sm text-on-surface truncate">{p.name}</div>
                      <div className="text-xs text-on-surface-variant">
                        ID: PRJ-{p.id.slice(0, 8).toUpperCase()} · Started: {formatDateShort(p.created_at)}
                      </div>
                    </div>
                    <StatusPill label={p.status} tone={toneForStatus(p.status)} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-stack-lg">
          <Card>
            <h3 className="font-headline-md text-headline-md flex items-center gap-2 mb-4">
              <Icon name="donut_large" size={20} className="text-on-surface-variant" /> Payment Progress
            </h3>
            <div className="flex items-center justify-between text-body-sm font-body-sm mb-1.5">
              <span className="font-semibold text-on-surface">{paidPct}%</span>
              <span className="text-on-surface-variant">
                {formatCurrency(totalPaid, company.currency)} / {formatCurrency(projectValue, company.currency)}
              </span>
            </div>
            <ProgressBar value={paidPct} variant={paidPct >= 100 ? "complete" : "normal"} />
            <div className="flex items-center justify-between text-xs text-on-surface-variant mt-2">
              <span>Advance ({client.advance_paid ? Math.round(((client.advance_paid || 0) / (projectValue || 1)) * 100) : 0}%)</span>
              <span>Balance ({100 - paidPct}%)</span>
            </div>
          </Card>

          <Card padded={false}>
            <h3 className="font-headline-md text-headline-md flex items-center gap-2 px-6 pt-6 pb-3">
              <Icon name="history" size={20} className="text-on-surface-variant" /> Payment History
            </h3>
            {clientPayments.length === 0 ? (
              <p className="text-body-sm font-body-sm text-outline px-6 pb-6">No payments recorded yet.</p>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {clientPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 text-body-sm font-body-sm">
                    <div>
                      <div className="text-on-surface font-medium">{formatDate(p.date)}</div>
                      <div className="text-xs text-on-surface-variant">{p.reference || p.method}</div>
                    </div>
                    <div className="text-status-success-text font-semibold">+{formatCurrency(p.amount, company.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padded={false}>
            <h3 className="font-headline-md text-headline-md flex items-center gap-2 px-6 pt-6 pb-3">
              <Icon name="timeline" size={20} className="text-on-surface-variant" /> Activity Timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="text-body-sm font-body-sm text-outline px-6 pb-6">No activity recorded yet.</p>
            ) : (
              <div className="px-6 pb-6 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                {timeline.map((a, i) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0 pt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-outline-variant"}`} />
                      {i < timeline.length - 1 && <span className="w-px flex-1 bg-outline-variant/60 mt-1" />}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className="text-body-sm font-body-sm text-on-surface">{a.summary}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Payment — spec Section 18 */}
      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Add Payment"
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitPayment}>
              Save Payment
            </Button>
          </>
        }
      >
        <Field label="Amount (₹)" required>
          <TextInput type="number" min={0} autoFocus value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="10000" />
        </Field>
        <Field label="Date" required>
          <TextInput type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
        </Field>
        <Field label="Payment Method">
          <Select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference">
          <TextInput value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="UTR / transaction ID" />
        </Field>
        <Field label="Notes">
          <TextInput value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Optional" />
        </Field>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Client"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!editForm) return;
                updateEntity<Client>("clients", client.id, editForm);
                logActivity({ entity_type: "Client", entity_id: client.id, summary: `${editForm.name} profile updated` });
                toast.success("Client updated successfully");
                setEditOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {editForm && (
          <>
            <Field label="Client / Business Name" required>
              <TextInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Description">
              <TextInput value={editForm.descriptor} onChange={(e) => setEditForm({ ...editForm, descriptor: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </Modal>
    </AppShell>
  );
}

