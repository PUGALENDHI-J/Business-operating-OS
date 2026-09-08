import type { Metadata } from 'next';
import { ShieldCheck, TrendingUp, Users, Calendar, Percent, HeartHandshake, Wallet, Clock3 } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';

export const metadata: Metadata = {
  title: 'Benefits',
  description: 'Why members choose NACHIYAR CHIT & FINANCE — flexible plans, transparent process, and a 15-day interest-free facility.',
};

const BENEFITS = [
  { icon: ShieldCheck, title: 'Trusted Company', text: 'Operating transparently since 2018.' },
  { icon: TrendingUp, title: 'Flexible Schemes', text: 'A range of scheme sizes and durations to fit different savings goals.' },
  { icon: Users, title: 'Member Friendly Plan', text: 'Schemes designed with member convenience in mind.' },
  { icon: Calendar, title: 'Digital Support', text: 'A mobile app to follow your scheme, payments, and auctions.' },
  { icon: Percent, title: 'Transparent Calculations', text: 'Published payout and dividend tables for fixed-payout schemes.' },
  { icon: HeartHandshake, title: 'Long Term Relationship', text: 'We aim to support members well beyond a single scheme cycle.' },
  { icon: Wallet, title: 'Secure Transactions', text: 'A structured process for contributions, auctions, and payouts.' },
  { icon: Clock3, title: '15 Days Interest-Free', text: 'Access up to 45% of your paid-in amount interest-free for 15 days.' },
];

export default function BenefitsPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Benefits" description="What members can expect from a NACHIYAR chit scheme." />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-white p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-xs text-muted">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <CtaLink href="/apply" size="lg">Start Your Application</CtaLink>
        </div>
      </Section>
    </>
  );
}
