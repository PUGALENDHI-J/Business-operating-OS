import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.website;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/chit-schemes', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/auction', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/benefits', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/apply', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

/**
 * Lists the static pages only. Individual /chit-schemes/[slug] pages are
 * deliberately NOT enumerated here via a build-time API call — scheme
 * detail pages render with `dynamic = 'force-dynamic'` (see that page's
 * comment) precisely so CRM edits show up immediately, and sitemap.ts
 * itself always executes as part of the build regardless of a `dynamic`
 * export, so fetching scheme data here would tie sitemap generation back
 * to the backend being reachable at build time. Search engines still
 * discover every scheme page normally via the crawlable links on
 * /chit-schemes — omitting them from sitemap.xml loses an explicit
 * priority hint, not discoverability.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
