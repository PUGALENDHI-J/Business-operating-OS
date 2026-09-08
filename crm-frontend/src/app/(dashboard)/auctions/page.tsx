"use client";

import { useState, FormEvent, useEffect } from "react";
import { Gavel, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useResourceList } from "@/lib/use-resource-list";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/auth-context";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Auction, AuctionBid, ChitGroup, ChitMember, ListResponse } from "@/lib/types";

interface CreateFormState { chit_group_id: string; cycle_number: string; scheduled_at: string; }

export default function AuctionsPage() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const { data, meta, loading, error, params, setParams, refetch } = useResourceList<Auction>("/auctions", {
    status: statusFilter || undefined,
  });

  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({ chit_group_id: "", cycle_number: "", scheduled_at: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [manageAuction, setManageAuction] = useState<Auction | null>(null);

  useEffect(() => {
    setParams({ status: statusFilter || undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!createOpen) return;
    api.get<ListResponse<ChitGroup>>("/chit-groups", { pageSize: 100, status: "active" }).then((r) => setGroups(r.data)).catch(() => {});
  }, [createOpen]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/auctions", {
        chit_group_id: createForm.chit_group_id,
        cycle_number: Number(createForm.cycle_number),
        scheduled_at: new Date(createForm.scheduled_at).toISOString(),
      });
      showToast("Auction scheduled.");
      setCreateOpen(false);
      setCreateForm({ chit_group_id: "", cycle_number: "", scheduled_at: "" });
      refetch();
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<Auction>[] = [
    { key: "scheduled_at", header: "Scheduled", sortable: true, render: (a) => formatDateTime(a.scheduled_at) },
    { key: "group_code", header: "Group", render: (a) => a.group_code },
    { key: "scheme_name", header: "Scheme", render: (a) => a.scheme_name },
    { key: "cycle_number", header: "Cycle", render: (a) => a.cycle_number },
    { key: "chit_amount", header: "Chit Amount", render: (a) => formatCurrency(a.chit_amount) },
    { key: "winning_customer_name", header: "Winner", render: (a) => a.winning_customer_name ?? "—" },
    { key: "prize_amount", header: "Prize", render: (a) => a.prize_amount ? formatCurrency(a.prize_amount) : "—" },
    { key: "status", header: "Status", sortable: true, render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Auctions"
        subtitle="Live bidding and prize/commission calculation for each chit cycle."
        action={can("auctions", "write") && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Schedule Auction</Button>}
      />

      <Card>
        <DataTable
          columns={columns} data={data} meta={meta} loading={loading} error={error}
          params={params} setParams={setParams} onRetry={refetch}
          searchPlaceholder="Search by group code…" emptyTitle="No auctions found"
          onRowClick={(a) => setManageAuction(a)}
          getRowKey={(a) => a.id}
          toolbarExtra={
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          }
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Schedule Auction">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="chit_group_id">Chit group</Label>
            <Select id="chit_group_id" required value={createForm.chit_group_id} onChange={(e) => setCreateForm({ ...createForm, chit_group_id: e.target.value })}>
              <option value="">Select a group…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.group_code} — {g.scheme_name}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="cycle_number">Cycle number</Label><Input id="cycle_number" type="number" required min={1} value={createForm.cycle_number} onChange={(e) => setCreateForm({ ...createForm, cycle_number: e.target.value })} /></div>
          <div><Label htmlFor="scheduled_at">Scheduled date &amp; time</Label><Input id="scheduled_at" type="datetime-local" required value={createForm.scheduled_at} onChange={(e) => setCreateForm({ ...createForm, scheduled_at: e.target.value })} /></div>
          {createError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{createError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Schedule</Button>
          </div>
        </form>
      </Modal>

      {manageAuction && (
        <ManageAuctionModal
          auction={manageAuction}
          onClose={() => setManageAuction(null)}
          onChanged={() => { refetch(); }}
        />
      )}
    </div>
  );
}

function ManageAuctionModal({ auction, onClose, onChanged }: { auction: Auction; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [bids, setBids] = useState<AuctionBid[] | null>(null);
  const [members, setMembers] = useState<ChitMember[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [bidPercent, setBidPercent] = useState("");
  const [placingBid, setPlacingBid] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [current, setCurrent] = useState(auction);

  const loadBids = () => {
    api.get<{ data: AuctionBid[] }>(`/auctions/${current.id}/bids`).then((r) => setBids(r.data)).catch(() => setBids([]));
  };
  const loadAuction = () => {
    api.get<{ data: Auction }>(`/auctions/${current.id}`).then((r) => setCurrent(r.data));
  };

  useEffect(() => {
    loadBids();
    api.get<{ data: ChitMember[] }>("/chit-members", { chitGroupId: current.chit_group_id, pageSize: 100 }).then((r) => {
      setMembers(r.data);
    }).catch(() => setMembers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeBid = async () => {
    if (!selectedMember || !bidPercent) return;
    setPlacingBid(true);
    try {
      await api.post(`/auctions/${current.id}/bids`, { chit_member_id: selectedMember, bid_percent: Number(bidPercent) });
      showToast("Bid recorded.");
      setBidPercent("");
      loadBids();
      loadAuction();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to place bid.", "error");
    } finally {
      setPlacingBid(false);
    }
  };

  const complete = async (winningMemberId: string) => {
    setCompleting(true);
    try {
      await api.post(`/auctions/${current.id}/complete`, { winning_chit_member_id: winningMemberId });
      showToast("Auction completed — prize and commission calculated.");
      loadAuction();
      loadBids();
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to complete auction.", "error");
    } finally {
      setCompleting(false);
    }
  };

  const isOpen = current.status === "scheduled" || current.status === "live";

  return (
    <Modal open onClose={onClose} title={`${current.scheme_name} — ${current.group_code}`} size="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <div>
            <p className="text-xs text-muted">Chit Amount</p>
            <p className="text-sm font-semibold">{formatCurrency(current.chit_amount)}</p>
          </div>
          <StatusBadge status={current.status} />
        </div>

        {current.status === "completed" && (
          <div className="rounded-lg border border-success/30 bg-success-bg p-4">
            <p className="text-sm font-medium text-slate-800">Winner: {current.winning_customer_name}</p>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted">Bid</p><p className="font-medium">{current.winning_bid_percent}%</p></div>
              <div><p className="text-xs text-muted">Prize</p><p className="font-medium">{formatCurrency(current.prize_amount)}</p></div>
              <div><p className="text-xs text-muted">Commission</p><p className="font-medium">{formatCurrency(current.commission_amount)}</p></div>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Bids</h4>
          {bids === null ? (
            <LoadingState />
          ) : bids.length === 0 ? (
            <EmptyState title="No bids placed yet" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {bids.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{b.customer_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{b.bid_percent}% ({formatCurrency(b.bid_amount)})</span>
                    {b.is_winning_bid && <StatusBadge status="completed" />}
                    {isOpen && can("auctions", "write") && !b.is_winning_bid && (
                      <Button size="sm" variant="secondary" loading={completing} onClick={() => complete(b.chit_member_id)}>
                        <Gavel className="h-3.5 w-3.5" /> Declare Winner
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOpen && can("auctions", "write") && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Place a Bid</h4>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="bid_member">Member</Label>
                <Select id="bid_member" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                  <option value="">Select member…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.customer_name}</option>)}
                </Select>
              </div>
              <div className="w-28">
                <Label htmlFor="bid_percent">Bid %</Label>
                <Input id="bid_percent" type="number" step="0.01" min={0} max={100} value={bidPercent} onChange={(e) => setBidPercent(e.target.value)} />
              </div>
              <Button onClick={placeBid} loading={placingBid} disabled={!selectedMember || !bidPercent}>Place Bid</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
