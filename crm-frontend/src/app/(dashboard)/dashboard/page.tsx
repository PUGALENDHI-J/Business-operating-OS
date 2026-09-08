"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserPlus, UserCircle, UsersRound, Clock, AlertCircle, IndianRupee, Gavel, Plus,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { StatCard, Card, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { ListResponse, Lead, Auction, ActivityRow } from "@/lib/types";

interface DashboardCounts {
  totalLeads: number;
  newLeads: number;
  customers: number;
  activeChitMembers: number;
  pendingPayments: number;
  overduePayments: number;
  todaysCollection: number;
  upcomingAuctions: number;
}

/**
 * The backend does not (yet) expose a single /dashboard/summary endpoint,
 * so these counts are assembled client-side from the existing list
 * endpoints' pagination metadata (meta.totalItems) — each is a real,
 * permission-checked request, just aggregated in the browser rather than
 * pre-aggregated server-side. If a future backend phase adds a combined
 * summary endpoint, this is the only place that needs to change.
 */
function useDashboardCounts() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [totalLeads, newLeads, customers, activeMembers, pending, overdue, todaysPayments, upcomingAuctions] =
          await Promise.all([
            api.get<ListResponse<unknown>>("/leads", { pageSize: 1 }),
            api.get<ListResponse<unknown>>("/leads", { pageSize: 1, status: "new" }),
            api.get<ListResponse<unknown>>("/customers", { pageSize: 1 }),
            api.get<ListResponse<unknown>>("/chit-members", { pageSize: 1 }),
            api.get<ListResponse<unknown>>("/installments", { pageSize: 1, status: "pending" }),
            api.get<ListResponse<unknown>>("/installments", { pageSize: 1, status: "overdue" }),
            api.get<ListResponse<unknown>>("/payments", { pageSize: 100, fromDate: todayStr, toDate: todayStr, status: "success" }),
            api.get<ListResponse<unknown>>("/auctions", { pageSize: 1, status: "scheduled" }),
          ]);
        if (cancelled) return;
        const todaysCollection = (todaysPayments.data as { amount: string }[]).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        setCounts({
          totalLeads: totalLeads.meta.totalItems,
          newLeads: newLeads.meta.totalItems,
          customers: customers.meta.totalItems,
          activeChitMembers: activeMembers.meta.totalItems,
          pendingPayments: pending.meta.totalItems,
          overduePayments: overdue.meta.totalItems,
          todaysCollection,
          upcomingAuctions: upcomingAuctions.meta.totalItems,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { counts, loading, error };
}

const PIPELINE_STAGES: { status: string; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "interested", label: "Interested" },
  { status: "follow_up", label: "Follow-up" },
  { status: "converted", label: "Converted" },
  { status: "lost", label: "Lost" },
];

function LeadPipeline() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(PIPELINE_STAGES.map((s) => api.get<ListResponse<Lead>>("/leads", { pageSize: 1, status: s.status }))).then((results) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      results.forEach((r, i) => (map[PIPELINE_STAGES[i].status] = r.meta.totalItems));
      setCounts(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader title="Lead Pipeline" action={<Link href="/leads" className="text-xs font-medium text-brand hover:underline">View All</Link>} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
        {PIPELINE_STAGES.map((s) => (
          <Link
            key={s.status}
            href={`/leads?status=${s.status}`}
            className="rounded-lg border border-border p-3 transition-colors hover:border-brand/40 hover:bg-brand/5"
          >
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{counts?.[s.status] ?? "…"}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentActivity() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  useEffect(() => {
    // Activity is normally scoped per-entity (see /customers/:id/activity);
    // there's no global "all activity" endpoint from a specific record, so
    // this panel intentionally shows nothing until wired to a real feed —
    // rather than fabricate global activity the API doesn't provide.
    setRows([]);
  }, []);

  return (
    <Card>
      <CardHeader title="Recent Activity" action={<Link href="/activity" className="text-xs font-medium text-brand hover:underline">View All</Link>} />
      <div className="p-5">
        {rows === null ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No recent activity to show yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="text-sm">
                <p className="text-slate-700">{r.description ?? titleCase(r.action)}</p>
                <p className="text-xs text-muted">{formatDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function UpcomingAuctions() {
  const [auctions, setAuctions] = useState<Auction[] | null>(null);
  useEffect(() => {
    api
      .get<ListResponse<Auction>>("/auctions", { pageSize: 5, status: "scheduled", sortBy: "scheduled_at", sortDir: "asc" })
      .then((res) => setAuctions(res.data))
      .catch(() => setAuctions([]));
  }, []);

  return (
    <Card>
      <CardHeader title="Upcoming Auctions" action={<Link href="/auctions" className="text-xs font-medium text-brand hover:underline">View All</Link>} />
      <div className="p-5">
        {auctions === null ? (
          <LoadingState />
        ) : auctions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No auctions scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {auctions.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <span className="text-[10px] font-medium uppercase leading-none">{new Date(a.scheduled_at).toLocaleString("en-IN", { month: "short" })}</span>
                  <span className="text-sm font-bold leading-none">{new Date(a.scheduled_at).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{a.scheme_name} — {a.group_code}</p>
                  <p className="text-xs text-muted">{formatCurrency(a.chit_amount)}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function QuickActions() {
  const { can } = useAuth();
  return (
    <Card>
      <CardHeader title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3 p-5">
        {can("leads", "write") && (
          <Link href="/leads?new=1"><Button className="w-full" size="sm"><Plus className="h-4 w-4" /> Add Lead</Button></Link>
        )}
        {can("customers", "write") && (
          <Link href="/customers?new=1"><Button className="w-full" size="sm" variant="secondary"><Plus className="h-4 w-4" /> Add Customer</Button></Link>
        )}
        {can("chit_groups", "write") && (
          <Link href="/chit-groups?new=1"><Button className="w-full" size="sm" variant="secondary"><Plus className="h-4 w-4" /> Create Chit Group</Button></Link>
        )}
        {can("payments", "write") && (
          <Link href="/payments?new=1"><Button className="w-full" size="sm" variant="secondary"><Plus className="h-4 w-4" /> Record Payment</Button></Link>
        )}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { counts, loading, error } = useDashboardCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted">Welcome back, {user?.full_name?.split(" ")[0]} — here&apos;s what&apos;s happening today.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Leads" value={loading ? "…" : String(counts!.totalLeads)} icon={Users} color="blue" />
          <StatCard label="New Leads" value={loading ? "…" : String(counts!.newLeads)} icon={UserPlus} color="green" />
          <StatCard label="Customers" value={loading ? "…" : String(counts!.customers)} icon={UserCircle} color="purple" />
          <StatCard label="Active Chit Members" value={loading ? "…" : String(counts!.activeChitMembers)} icon={UsersRound} color="amber" />
          <StatCard label="Pending Payments" value={loading ? "…" : String(counts!.pendingPayments)} icon={Clock} color="amber" />
          <StatCard label="Overdue Payments" value={loading ? "…" : String(counts!.overduePayments)} icon={AlertCircle} color="red" />
          <StatCard label="Today's Collection" value={loading ? "…" : formatCurrency(counts!.todaysCollection)} icon={IndianRupee} color="green" />
          <StatCard label="Upcoming Auctions" value={loading ? "…" : String(counts!.upcomingAuctions)} icon={Gavel} color="teal" hint="Next 30 days" />
        </div>
      )}

      <LeadPipeline />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <UpcomingAuctions />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
