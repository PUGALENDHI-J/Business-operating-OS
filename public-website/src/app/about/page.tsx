import type { Metadata } from 'next';
import { ShieldCheck, Users, LineChart, HeartHandshake } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${siteConfig.companyName}, a chit fund company based in ${siteConfig.address.line}, trusted since ${siteConfig.trustedSince}.`,
};

const VALUES = [
  { icon: ShieldCheck, title: 'Trusted Company', text: 'Operating with a straightforward, published approach to chit schemes since 2018.' },
  { icon: Users, title: 'Member First Approach', text: 'Our schemes are designed around what members need — flexible plans, clear terms.' },
  { icon: LineChart, title: 'Financial Discipline', text: 'Structured, published payout schedules for every scheme we offer.' },
  { icon: HeartHandshake, title: 'Long Term Relationship', text: 'We aim to be a long-term financial partner for our members and their families.' },
];

export default function AboutPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="About NACHIYAR CHIT & FINANCE" description={siteConfig.tagline} />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Who We Are</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {siteConfig.companyName} is a chit fund company based in {siteConfig.address.line}, trusted since{' '}
              {siteConfig.trustedSince}. We offer a range of chit schemes — from steady monthly plans to auction-based
              schemes — built around the idea that small, regular savings can lead to real financial progress when
              done together as a group.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Our approach centers on transparency: published scheme terms, a clear auction process for auction-based
              schemes, and a mobile app so members can follow their scheme, payments, and auctions from anywhere.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">At a Glance</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between border-b border-border pb-3">
                <dt className="text-muted">Trusted Since</dt>
                <dd className="font-semibold text-foreground">{siteConfig.trustedSince}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <dt className="text-muted">Location</dt>
                <dd className="text-right font-semibold text-foreground">{siteConfig.address.line}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Contact</dt>
                <dd className="font-semibold text-foreground">{siteConfig.phone}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="What We Stand For" title="Our Values" center />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-white p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-xs text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
