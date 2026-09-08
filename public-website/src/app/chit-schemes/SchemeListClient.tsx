'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { useSchemes } from '@/lib/use-public-data';
import { formatCurrency, titleCase } from '@/lib/utils';

export function SchemeListClient() {
  const { data: schemes, loading, error } = useSchemes();

  if (loading) return <LoadingState label="Loading schemes…" />;
  if (error) return <ErrorState message="We're unable to load scheme details right now. Please call us, or try again shortly." />;
  if (!schemes || schemes.length === 0) {
    return <p className="text-sm text-muted">Scheme details are being updated. Please check back shortly.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {schemes.map((scheme) => (
        <Link
          key={scheme.id}
          href={`/chit-schemes/${scheme.slug}`}
          className="group flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          {scheme.is_featured && (
            <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
              Featured
            </span>
          )}
          <h2 className="text-lg font-semibold text-foreground group-hover:text-brand">{scheme.name}</h2>
          <p className="mt-1 text-2xl font-bold text-brand">{formatCurrency(scheme.chit_amount)}</p>
          <p className="text-sm text-muted">
            {scheme.member_count} members · {scheme.duration_periods} {scheme.frequency === 'weekly' ? 'weeks' : 'months'} ·{' '}
            {formatCurrency(scheme.installment_amount)} {titleCase(scheme.frequency)}
          </p>
          {scheme.short_description && <p className="mt-3 text-sm text-muted">{scheme.short_description}</p>}
          {scheme.highlights?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {scheme.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex items-center gap-1.5 text-xs text-foreground/80">
                  <span className="h-1 w-1 rounded-full bg-gold" /> {h}
                </li>
              ))}
            </ul>
          )}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            View details &amp; enquire <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
