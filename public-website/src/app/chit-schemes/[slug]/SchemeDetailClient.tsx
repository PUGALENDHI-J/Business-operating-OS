'use client';

import { CheckCircle2 } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { useScheme } from '@/lib/use-public-data';
import { formatCurrency, titleCase } from '@/lib/utils';
import { siteConfig } from '@/lib/site-config';

export function SchemeDetailClient({ slug }: { slug: string }) {
  const { data: scheme, loading, error } = useScheme(slug);

  if (loading) {
    return (
      <Section>
        <LoadingState />
      </Section>
    );
  }

  if (error || !scheme) {
    return (
      <Section>
        <ErrorState message="We couldn't find that scheme, or it's no longer published. It may have been renamed or removed." />
      </Section>
    );
  }

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Chit Schemes', item: `${siteConfig.website}/chit-schemes` },
            { '@type': 'ListItem', position: 2, name: scheme.name, item: `${siteConfig.website}/chit-schemes/${scheme.slug}` },
          ],
        }}
      />

      <Section tone="brand">
        <SectionHeading title={scheme.name} description={scheme.short_description ?? undefined} />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-3xl font-bold text-brand">{formatCurrency(scheme.chit_amount)}</p>
              <p className="text-sm text-muted">Total chit amount</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Members" value={String(scheme.member_count)} />
                <Stat label="Duration" value={`${scheme.duration_periods} ${scheme.frequency === 'weekly' ? 'weeks' : 'months'}`} />
                <Stat label="Installment" value={formatCurrency(scheme.installment_amount)} />
                <Stat label="Frequency" value={titleCase(scheme.frequency)} />
              </dl>
            </div>

            {scheme.highlights?.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-foreground">Scheme Highlights</h2>
                <ul className="mt-4 space-y-3">
                  {scheme.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-foreground/90">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-8 text-xs text-muted">
              Figures shown are the scheme&apos;s published terms. For any dividend/payout illustrations or scheme
              comparisons, please contact our team — nothing beyond what&apos;s shown here should be assumed.
            </p>
          </div>

          <div>
            <EnquiryForm
              preselectedSchemeId={scheme.id}
              heading={`Enquire about ${scheme.name}`}
              submitLabel="Send Enquiry"
            />
          </div>
        </div>
      </Section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
