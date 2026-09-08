"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, IndianRupee, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import type {
  Customer, CustomerDocument, ChitMembership, CustomerPaymentRow, CustomerOutstanding,
  CustomerAuctionRow, Followup, WhatsappHistoryRow, ActivityRow,
} from "@/lib/types";

const TABS = [
  "Overview", "Personal Information", "Contact", "Address", "Documents",
  "Chit Memberships", "Payment History", "Outstanding Amount", "Auction History",
  "Follow-ups", "WhatsApp History", "Activity",
] as const;
type Tab = (typeof TABS)[number];

function useSubResource<T>(customerId: string, path: string, active: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || data !== null) return;
    setLoading(true);
    setError(null);
    api
      .get<{ data: T }>(`/customers/${customerId}${path}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { data, loading, error };
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("Overview");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<{ data: Customer }>(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load customer."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <LoadingState />;
  if (error || !customer) return <ErrorState message={error ?? "Customer not found."} onRetry={load} />;

  return (
    <div>
      <PageHeader
        backHref="/customers"
        title={customer.full_name}
        subtitle={`${customer.phone}${customer.city ? " · " + customer.city : ""}`}
        action={<StatusBadge status={customer.kyc_status} />}
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
              tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-slate-700",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab customer={customer} />}
      {tab === "Personal Information" && <PersonalInfoTab customer={customer} />}
      {tab === "Contact" && <ContactTab customer={customer} />}
      {tab === "Address" && <AddressTab customer={customer} />}
      {tab === "Documents" && <DocumentsTab customerId={customer.id} active={tab === "Documents"} can={can} showToast={showToast} />}
      {tab === "Chit Memberships" && <ChitMembershipsTab customerId={customer.id} active={tab === "Chit Memberships"} />}
      {tab === "Payment History" && <PaymentHistoryTab customerId={customer.id} active={tab === "Payment History"} />}
      {tab === "Outstanding Amount" && <OutstandingTab customerId={customer.id} active={tab === "Outstanding Amount"} />}
      {tab === "Auction History" && <AuctionHistoryTab customerId={customer.id} active={tab === "Auction History"} />}
      {tab === "Follow-ups" && <FollowupsTab customerId={customer.id} active={tab === "Follow-ups"} />}
      {tab === "WhatsApp History" && <WhatsappHistoryTab customerId={customer.id} active={tab === "WhatsApp History"} />}
      {tab === "Activity" && <ActivityTab customerId={customer.id} active={tab === "Activity"} />}
    </div>
  );
}

function OverviewTab({ customer }: { customer: Customer }) {
  const { data: outstanding } = useSubResource<CustomerOutstanding>(customer.id, "/outstanding", true);
  const { data: memberships } = useSubResource<ChitMembership[]>(customer.id, "/chit-memberships", true);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-xs font-medium text-muted">Outstanding Amount</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{outstanding ? formatCurrency(outstanding.outstandingAmount) : "…"}</p>
        {outstanding && outstanding.overdueAmount > 0 && (
          <Badge tone="danger" className="mt-2">{formatCurrency(outstanding.overdueAmount)} overdue</Badge>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-xs font-medium text-muted">Active Chit Memberships</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {memberships ? memberships.filter((m) => m.status === "active").length : "…"}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-medium text-muted">KYC Status</p>
        <div className="mt-1"><StatusBadge status={customer.kyc_status} /></div>
      </Card>
    </div>
  );
}

function PersonalInfoTab({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader title="Personal Information" />
      <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
        <Field label="Full Name" value={customer.full_name} />
        <Field label="Date of Birth" value={formatDate(customer.date_of_birth)} />
        <Field label="KYC Status" value={<StatusBadge status={customer.kyc_status} />} />
        <Field label="Account Status" value={customer.is_active ? "Active" : "Inactive"} />
        <Field label="Assigned Staff" value={customer.assigned_staff_name ?? "Unassigned"} />
        <Field label="Branch" value={customer.branch_name ?? "—"} />
      </dl>
    </Card>
  );
}

function ContactTab({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader title="Contact Information" />
      <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
        <Field label="Phone" value={customer.phone} />
        <Field label="Email" value={customer.email ?? "—"} />
      </dl>
    </Card>
  );
}

function AddressTab({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader title="Address" />
      <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
        <Field label="Address Line 1" value={customer.address_line1 ?? "—"} />
        <Field label="Address Line 2" value={customer.address_line2 ?? "—"} />
        <Field label="City" value={customer.city ?? "—"} />
        <Field label="State" value={customer.state ?? "—"} />
        <Field label="Pincode" value={customer.pincode ?? "—"} />
      </dl>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function DocumentsTab({
  customerId, active, can, showToast,
}: {
  customerId: string;
  active: boolean;
  can: (m: string, a: "read" | "write" | "delete") => boolean;
  showToast: (msg: string, variant?: "success" | "error") => void;
}) {
  const { data, loading, error } = useSubResource<CustomerDocument[]>(customerId, "/documents", active);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("aadhaar");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<CustomerDocument[] | null>(null);

  useEffect(() => { if (data) setDocs(data); }, [data]);

  const refresh = () => api.get<{ data: CustomerDocument[] }>(`/customers/${customerId}/documents`).then((r) => setDocs(r.data));

  const handleUpload = async () => {
    setSaving(true);
    try {
      await api.post(`/customers/${customerId}/documents`, { document_type: docType, file_url: fileUrl });
      showToast("Document added.");
      setUploadOpen(false);
      setFileUrl("");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add document.", "error");
    } finally {
      setSaving(false);
    }
  };

  const review = async (docId: string, status: "verified" | "rejected") => {
    try {
      await api.patch(`/customers/documents/${docId}/review`, { status });
      showToast(status === "verified" ? "Document verified." : "Document rejected.");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update document.", "error");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const list = docs ?? [];

  return (
    <Card>
      <CardHeader
        title="Documents"
        action={can("customers", "write") && <Button size="sm" onClick={() => setUploadOpen(true)}>Add Document</Button>}
      />
      {list.length === 0 ? (
        <EmptyState title="No documents uploaded" description="KYC and other supporting documents will appear here." />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{titleCase(d.document_type)}</p>
                <p className="text-xs text-muted">Uploaded {formatDate(d.uploaded_at)}</p>
              </div>
              <StatusBadge status={d.status} />
              <a href={d.file_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand">
                <ExternalLink className="h-4 w-4" />
              </a>
              {can("customers", "write") && d.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => review(d.id, "verified")}>Verify</Button>
                  <Button size="sm" variant="danger" onClick={() => review(d.id, "rejected")}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Add Document" size="sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="doc_type">Document type</Label>
            <Select id="doc_type" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="address_proof">Address Proof</option>
              <option value="photo">Photo</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="file_url">File URL</Label>
            <Input id="file_url" placeholder="https://…" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} loading={saving} disabled={!fileUrl}>Add</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function ChitMembershipsTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<ChitMembership[]>(customerId, "/chit-memberships", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No chit memberships" description="Groups this customer has joined will appear here." />;

  return (
    <Card>
      <CardHeader title="Chit Memberships" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/60 text-left text-xs font-medium uppercase text-muted">
            <th className="px-5 py-2.5">Scheme</th><th className="px-5 py-2.5">Group</th><th className="px-5 py-2.5">Serial #</th>
            <th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Joined</th><th className="px-5 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((m) => (
            <tr key={m.id}>
              <td className="px-5 py-3">{m.scheme_name}</td>
              <td className="px-5 py-3">{m.group_code}</td>
              <td className="px-5 py-3">{m.member_serial_no}</td>
              <td className="px-5 py-3">{formatCurrency(m.chit_amount)}</td>
              <td className="px-5 py-3">{formatDate(m.join_date)}</td>
              <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PaymentHistoryTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<CustomerPaymentRow[]>(customerId, "/payments", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No payments yet" />;

  return (
    <Card>
      <CardHeader title="Payment History" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/60 text-left text-xs font-medium uppercase text-muted">
            <th className="px-5 py-2.5">Date</th><th className="px-5 py-2.5">Group / Cycle</th><th className="px-5 py-2.5">Amount</th>
            <th className="px-5 py-2.5">Method</th><th className="px-5 py-2.5">Receipt</th><th className="px-5 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((p) => (
            <tr key={p.id}>
              <td className="px-5 py-3">{formatDate(p.payment_date)}</td>
              <td className="px-5 py-3">{p.group_code} · Cycle {p.cycle_number}</td>
              <td className="px-5 py-3 font-medium">{formatCurrency(p.amount)}</td>
              <td className="px-5 py-3">{titleCase(p.payment_method)}</td>
              <td className="px-5 py-3">{p.receipt_number ?? "—"}</td>
              <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function OutstandingTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<CustomerOutstanding>(customerId, "/outstanding", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><IndianRupee className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted">Total Outstanding</p>
            <p className="text-xl font-semibold text-slate-900">{formatCurrency(data.outstandingAmount)}</p>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600"><IndianRupee className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted">Overdue</p>
            <p className="text-xl font-semibold text-slate-900">{formatCurrency(data.overdueAmount)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AuctionHistoryTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<CustomerAuctionRow[]>(customerId, "/auctions", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No auction participation yet" />;

  return (
    <Card>
      <CardHeader title="Auction History" />
      <ul className="divide-y divide-border">
        {data.map((a) => (
          <li key={a.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-800">{a.scheme_name} — {a.group_code} (Cycle {a.cycle_number})</p>
              <p className="text-xs text-muted">{formatDateTime(a.scheduled_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              {a.won_by_this_customer && <Badge tone="success">Won</Badge>}
              <StatusBadge status={a.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FollowupsTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<Followup[]>(customerId, "/followups", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No follow-ups scheduled" />;

  return (
    <Card>
      <CardHeader title="Follow-ups" />
      <ul className="divide-y divide-border">
        {data.map((f) => (
          <li key={f.id} className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{formatDate(f.due_date)}</p>
              <StatusBadge status={f.status} />
            </div>
            {f.notes && <p className="mt-1 text-sm text-muted">{f.notes}</p>}
            <p className="mt-1 text-xs text-muted">{f.assigned_staff_name ? `Assigned to ${f.assigned_staff_name}` : "Unassigned"}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function WhatsappHistoryTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<WhatsappHistoryRow[]>(customerId, "/whatsapp-history", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No WhatsApp messages yet"
        description="Automated WhatsApp notifications are not yet enabled for this system — this tab will populate once that integration goes live."
      />
    );
  }
  return (
    <Card>
      <CardHeader title="WhatsApp History" />
      <ul className="divide-y divide-border">
        {data.map((w) => (
          <li key={w.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-800">{w.template_name ?? "Message"}</p>
              <p className="text-xs text-muted">{w.sent_at ? formatDateTime(w.sent_at) : "Not sent yet"}</p>
            </div>
            <StatusBadge status={w.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ActivityTab({ customerId, active }: { customerId: string; active: boolean }) {
  const { data, loading, error } = useSubResource<ActivityRow[]>(customerId, "/activity", active);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState title="No activity recorded yet" />;

  return (
    <Card>
      <CardHeader title="Activity" />
      <ul className="divide-y divide-border">
        {data.map((a) => (
          <li key={a.id} className="px-5 py-3.5">
            <p className="text-sm text-slate-700">{a.description ?? titleCase(a.action)}</p>
            <p className="text-xs text-muted">{formatDateTime(a.created_at)}{a.actor_name ? ` · ${a.actor_name}` : ""}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
