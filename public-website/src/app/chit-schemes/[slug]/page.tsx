import type { Metadata } from 'next';
import { SchemeDetailClient } from './SchemeDetailClient';

/**
 * generateMetadata here deliberately does NOT fetch the scheme from the
 * API — see the project-wide note in lib/use-public-data.ts: server-side
 * fetch() during Next's build/render pipeline is broken in this specific
 * environment. The slug itself is available with zero network calls, so
 * we derive a reasonable, honest title from it (e.g. "gold-a1-1l" ->
 * "Gold A1 1L") rather than leaving the tab title generic. The page body
 * fetches the full scheme client-side and sets nothing here that could
 * be wrong or stale.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const readableName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return {
    title: readableName,
    description: `${readableName} — chit scheme details from NACHIYAR CHIT & FINANCE PVT LTD.`,
  };
}

export default async function SchemeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SchemeDetailClient slug={slug} />;
}
