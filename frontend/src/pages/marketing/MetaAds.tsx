import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { KPICard } from "../../components/ui/KPICard";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { calculateCPL, calculateCAC, calculateROAS } from "../../lib/calculations";
import { formatCurrency } from "../../lib/format";
import { newId, nowIso } from "../../lib/id";
import { toast } from "../../components/ui/Toast";
import type { AdCampaign, MarketingChannel } from "../../types";

export default function MetaAds() {
  const { adCampaigns, company, addEntity } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "Meta Ads" as MarketingChannel, spend: 0, leads_generated: 0, clients_generated: 0, revenue_attributed: 0 });

  const metaCampaigns = adCampaigns.filter((c) => c.channel === "Meta Ads");
  const totalSpend = metaCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads = metaCampaigns.reduce((s, c) => s + c.leads_generated, 0);
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const totalRevenue = metaCampaigns.reduce((s, c) => s + c.revenue_attributed, 0);
  const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  function handleCreate() {
    if (!form.name) {
      toast.error("Campaign name is required");
      return;
    }
    const campaign: AdCampaign = {
      id: newId(),
      company_id: company.id,
      channel: form.channel,
      name: form.name,
      spend: form.spend,
      leads_generated: form.leads_generated,
      clients_generated: form.clients_generated,
      revenue_attributed: form.revenue_attributed,
      status: "Active",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("adCampaigns", campaign);
    toast.success("Campaign added");
    setModalOpen(false);
    setForm({ name: "", channel: "Meta Ads", spend: 0, leads_generated: 0, clients_generated: 0, revenue_attributed: 0 });
  }

  const columns: Column<AdCampaign>[] = [
    { key: "name", label: "Campaign", sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: "spend", label: "Spend", align: "right", sortValue: (r) => r.spend, render: (r) => formatCurrency(r.spend, company.currency) },
    { key: "leads", label: "Leads", align: "center", hideOnMobile: true, render: (r) => r.leads_generated },
    { key: "cpl", label: "CPL", align: "right", hideOnMobile: true, render: (r) => formatCurrency(calculateCPL(r), company.currency) },
    { key: "cac", label: "CAC", align: "right", hideOnMobile: true, render: (r) => formatCurrency(calculateCAC(r), company.currency) },
    { key: "roas", label: "ROAS", align: "right", render: (r) => <span className="font-semibold">{calculateROAS(r).toFixed(1)}x</span> },
    { key: "status", label: "Status", width: "w-24", align: "center", render: (r) => <StatusPill label={r.status} /> },
  ];

  return (
    <AppShell>
      <PageHeader title="Meta Ads" subtitle="Campaign performance and acquisition efficiency." right={<Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>Add Campaign</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Total Spend" value={formatCurrency(totalSpend, company.currency)} hasData={metaCampaigns.length > 0} height={110} />
        <KPICard label="Avg CPL" value={formatCurrency(avgCPL, company.currency)} hasData={totalLeads > 0} height={110} />
        <KPICard label="Revenue Attributed" value={formatCurrency(totalRevenue, company.currency)} hasData={metaCampaigns.length > 0} height={110} />
        <KPICard label="ROAS" value={`${avgROAS.toFixed(1)}x`} hasData={totalSpend > 0} trend={totalSpend > 0 ? { direction: avgROAS >= 1 ? "up" : "down", label: `${avgROAS.toFixed(1)}x` } : undefined} height={110} />
      </div>

      <DataTable
        columns={columns}
        rows={metaCampaigns}
        searchFields={(r) => r.name}
        exportFilename="meta-ads"
        emptyState={{ icon: "ads_click", title: "No Meta Ads campaigns yet", description: "Add a campaign to start tracking cost per lead, CAC, and ROAS.", actionLabel: "+ Add your first campaign", onAction: () => setModalOpen(true) }}
        height={420}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Add Campaign</Button>
          </>
        }
      >
        <Field label="Campaign Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prospecting — Founders" />
        </Field>
        <Field label="Channel">
          <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as MarketingChannel })}>
            <option>Meta Ads</option>
            <option>Google Ads</option>
            <option>SEO</option>
            <option>Referral</option>
            <option>Email</option>
            <option>Organic Social</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Spend">
            <TextInput type="number" value={form.spend} onChange={(e) => setForm({ ...form, spend: Number(e.target.value) })} />
          </Field>
          <Field label="Leads Generated">
            <TextInput type="number" value={form.leads_generated} onChange={(e) => setForm({ ...form, leads_generated: Number(e.target.value) })} />
          </Field>
          <Field label="Clients Generated">
            <TextInput type="number" value={form.clients_generated} onChange={(e) => setForm({ ...form, clients_generated: Number(e.target.value) })} />
          </Field>
          <Field label="Revenue Attributed">
            <TextInput type="number" value={form.revenue_attributed} onChange={(e) => setForm({ ...form, revenue_attributed: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
