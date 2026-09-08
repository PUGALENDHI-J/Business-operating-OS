import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.website;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
