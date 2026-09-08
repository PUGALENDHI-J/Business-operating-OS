import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingCtaBar } from '@/components/layout/FloatingCtaBar';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/lib/site-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.website;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${siteConfig.companyName} — Chit Schemes in Vellore, Tamil Nadu`,
    template: `%s | ${siteConfig.companyName}`,
  },
  description: `${siteConfig.companyName} offers chit fund schemes in Velpadi, Vellore, Tamil Nadu. Trusted since ${siteConfig.trustedSince}. ${siteConfig.tagline}.`,
  keywords: ['chit fund', 'chit scheme', 'Vellore chit fund', 'Nachiyar chit', 'Tamil Nadu chit fund', 'savings scheme'],
  authors: [{ name: siteConfig.companyName }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: siteConfig.companyName,
    title: `${siteConfig.companyName} — Chit Schemes in Vellore, Tamil Nadu`,
    description: `Trusted chit fund schemes since ${siteConfig.trustedSince}. ${siteConfig.tagline}.`,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.companyName,
    description: `Trusted chit fund schemes since ${siteConfig.trustedSince}.`,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="flex min-h-full flex-col font-sans antialiased">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FinancialService',
            name: siteConfig.companyName,
            description: siteConfig.tagline,
            url: SITE_URL,
            telephone: siteConfig.phoneIntl,
            email: siteConfig.email,
            foundingDate: String(siteConfig.trustedSince),
            address: {
              '@type': 'PostalAddress',
              addressLocality: siteConfig.address.city,
              addressRegion: siteConfig.address.state,
              addressCountry: siteConfig.address.country,
              streetAddress: siteConfig.address.line,
            },
          }}
        />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <FloatingCtaBar />
      </body>
    </html>
  );
}
