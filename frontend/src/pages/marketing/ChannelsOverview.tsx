import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { useStore } from "../../lib/store";
import { formatCurrency } from "../../lib/format";
import type { MarketingChannel } from "../../types";

const CHANNEL_ICON: Record<MarketingChannel, string> = {
  "Meta Ads": "ads_click",
  "Google Ads": "search",
  SEO: "travel_explore",
  Referral: "diversity_3",
  Email: "mail",
  "Organic Social": "share",
};

export default function ChannelsOverview() {
  const navigate = useNavigate();
  const { adCampaigns, company } = useStore();

  const channels = Array.from(new Set(adCampaigns.map((c) => c.channel)));

  return (
    <AppShell>
      <PageHeader title="Marketing Channels" subtitle="Where your leads and revenue are coming from." />

      {channels.length === 0 ? (
        <Card>
          <EmptyState
            icon="hub"
            title="No channels tracked yet"
            description="Add a campaign under Meta Ads (or another channel) to see channel-level performance here."
            actionLabel="Go to Meta Ads"
            onAction={() => navigate("/marketing/meta-ads")}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {channels.map((channel) => {
            const campaigns = adCampaigns.filter((c) => c.channel === channel);
            const spend = campaigns.reduce((s, c) => s + c.spend, 0);
            const revenue = campaigns.reduce((s, c) => s + c.revenue_attributed, 0);
            const leads = campaigns.reduce((s, c) => s + c.leads_generated, 0);
            const roas = spend > 0 ? revenue / spend : 0;
            return (
              <Card key={channel} className="cursor-pointer hover:shadow-soft-hover" onClick={() => channel === "Meta Ads" && navigate("/marketing/meta-ads")}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                    <Icon name={CHANNEL_ICON[channel]} className="text-on-surface-variant" />
                  </div>
                  <h3 className="font-headline-md text-headline-md">{channel}</h3>
                </div>
                <dl className="space-y-2 text-body-sm font-body-sm">
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Spend</dt>
                    <dd className="font-semibold">{formatCurrency(spend, company.currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Leads</dt>
                    <dd className="font-semibold">{leads}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">ROAS</dt>
                    <dd className="font-semibold">{roas.toFixed(1)}x</dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
