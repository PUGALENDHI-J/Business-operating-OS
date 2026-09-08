"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "interested", "follow_up", "lost"];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<{ data: Lead }>(`/leads/${id}`)
      .then((res) => setLead(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load lead."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleStatusChange = async (status: LeadStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/leads/${id}`, { status });
      showToast("Status updated.");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await api.post<{ data: { customerId: string } }>(`/leads/${id}/convert`, {});
      showToast("Lead converted to customer.");
      setConvertOpen(false);
      router.push(`/customers/${res.data.customerId}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to convert lead.", "error");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !lead) return <ErrorState message={error ?? "Lead not found."} onRetry={load} />;

  return (
    <div>
      <PageHeader
        backHref="/leads"
        title={lead.full_name}
        subtitle={lead.phone}
        action={
          lead.status !== "converted" &&
          can("leads", "write") && (
            <Button onClick={() => setConvertOpen(true)}>
              <UserCheck className="h-4 w-4" /> Convert to Customer
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lead Details" />
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div><dt className="text-xs text-muted">Full Name</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.full_name}</dd></div>
            <div><dt className="text-xs text-muted">Phone</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.phone}</dd></div>
            <div><dt className="text-xs text-muted">Email</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.email ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Source</dt><dd className="mt-0.5 font-medium text-slate-800">{titleCase(lead.source) }</dd></div>
            <div><dt className="text-xs text-muted">Interested Scheme</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.interested_scheme_name ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Branch</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.branch_name ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Assigned Staff</dt><dd className="mt-0.5 font-medium text-slate-800">{lead.assigned_staff_name ?? "Unassigned"}</dd></div>
            <div><dt className="text-xs text-muted">Created</dt><dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(lead.created_at)}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted">Notes</dt><dd className="mt-0.5 text-slate-700">{lead.notes || "No notes yet."}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Status" />
          <div className="space-y-4 p-5">
            <div>
              <StatusBadge status={lead.status} />
            </div>
            {lead.status === "converted" ? (
              <p className="text-sm text-muted">This lead has already been converted to a customer.</p>
            ) : can("leads", "write") ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Move to stage</label>
                <Select value={lead.status} disabled={updatingStatus} onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{titleCase(s)}</option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        onConfirm={handleConvert}
        title="Convert lead to customer?"
        message={`This creates a new customer record for "${lead.full_name}" and marks this lead as converted.`}
        confirmLabel="Convert"
        loading={converting}
      />
    </div>
  );
}
