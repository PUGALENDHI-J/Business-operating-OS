import type { Metadata } from 'next';
import { ShieldCheck, TrendingUp, Users, Smartphone, Gavel, Clock3, ArrowRight, Star } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';
import { FeaturedSchemesClient } from '@/components/data/FeaturedSchemesClient';
import { siteConfig, whatsappHref } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Home',
  description: `${siteConfig.companyName} — trusted chit fund schemes in Velpadi, Vellore, Tamil Nadu since ${siteConfig.trustedSince}. Silver, Gold, Diamond, Platinum and special chit schemes.`,
};

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Trusted Company' },
  { icon: TrendingUp, label: 'Flexible Schemes' },
  { icon: Users, label: 'Member Friendly' },
  { icon: Smartphone, label: 'Digital Support' },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand to-brand-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-gold-light">
              <Star className="h-3.5 w-3.5" /> Trusted Since {siteConfig.trustedSince}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {siteConfig.companyName}
            </h1>
            <p className="mt-4 text-lg font-medium text-gold-light sm:text-xl">{siteConfig.tagline}</p>
            <p className="mt-4 text-base text-white/80 sm:text-lg">
              A simple, transparent way to save and grow together — from our office in {siteConfig.address.line}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href="/apply" variant="secondary" size="lg">
                Apply Now <ArrowRight className="h-4 w-4" />
              </CtaLink>
              <CtaLink href={whatsappHref()} variant="outline" size="lg" target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </CtaLink>
            </div>
          </div>
        </div>
      </section>

      <Section tone="surface" className="py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {TRUST_POINTS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Our Schemes"
          title="Chit Schemes Built Around You"
          description="From steady monthly schemes to fast-paced auction-based plans — explore what fits your savings goals."
        />
        <FeaturedSchemesClient />
        <div className="mt-10 text-center">
          <CtaLink href="/chit-schemes" variant="outline" className="!border-brand !text-brand hover:!bg-brand/5">
            View All Schemes
          </CtaLink>
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Simple Process" title="How a NACHIYAR Chit Works" />
            <ul className="space-y-4">
              {[
                { icon: Users, text: 'A fixed group of members joins a chit scheme together.' },
                { icon: Clock3, text: 'Each member contributes the scheme\u2019s installment amount every cycle.' },
                { icon: Gavel, text: 'For auction-based schemes, a live auction decides who receives the pooled amount that cycle.' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white text-sm font-bold">{i + 1}</div>
                  <p className="pt-1.5 text-sm text-foreground/90"><Icon className="mr-1.5 inline h-4 w-4 text-gold" />{text}</p>
                </li>
              ))}
            </ul>
            <CtaLink href="/how-it-works" variant="ghost" className="mt-6 !px-0">
              Learn more about how it works <ArrowRight className="h-4 w-4" />
            </CtaLink>
          </div>
          <div className="rounded-2xl border border-border bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">15 Days Interest-Free Facility</p>
            <p className="mt-2 text-sm text-muted">
              Members who have been contributing regularly can access up to 45% of the amount they&apos;ve paid in as an
              interest-free facility for 15 days, for emergency needs.
            </p>
            <CtaLink href="/benefits" size="sm" className="mt-4">See All Benefits</CtaLink>
          </div>
        </div>
      </Section>

      <Section tone="brand" className="text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to start saving with confidence?</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/80">
          Speak with our team about which scheme fits your goals, or apply directly online.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaLink href="/apply" variant="secondary" size="lg">Apply Now</CtaLink>
          <CtaLink href="/contact" variant="outline" size="lg">Contact Us</CtaLink>
        </div>
      </Section>
    </>
  );
}
