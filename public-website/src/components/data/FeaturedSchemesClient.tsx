'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSchemes } from '@/lib/use-public-data';
import { formatCurrency } from '@/lib/utils';

export function FeaturedSchemesClient() {
  const { data: schemes, loading } = useSchemes();
  const featured = schemes?.filter((s) => s.is_featured).slice(0, 3) ?? [];

  if (loading) {
    return <p className="text-sm text-muted">Loading schemes…</p>;
  }

  if (featured.length === 0) {
    return <p className="text-sm text-muted">Scheme details are being updated. Please check back shortly or contact us directly.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((scheme) => (
        <Link
          key={scheme.id}
          href={`/chit-schemes/${scheme.slug}`}
          className="group flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
            Featured
          </span>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-brand">{scheme.name}</h3>
          <p className="mt-1 text-2xl font-bold text-brand">{formatCurrency(scheme.chit_amount)}</p>
          <p className="text-sm text-muted">{scheme.member_count} members · {scheme.duration_periods} {scheme.frequency === 'weekly' ? 'weeks' : 'months'}</p>
          {scheme.short_description && <p className="mt-3 text-sm text-muted">{scheme.short_description}</p>}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            View details <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
