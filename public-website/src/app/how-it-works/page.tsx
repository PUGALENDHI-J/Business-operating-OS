import type { Metadata } from 'next';
import { Users, Calendar, Gavel, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';

export const metadata: Metadata = {
  title: 'How Chit Works',
  description: 'A step-by-step explanation of how a NACHIYAR chit scheme works, from joining a group to receiving your payout.',
};

const STEPS = [
  { icon: Users, title: 'Join a Group', text: 'A fixed number of members join a chit scheme together — the group size and total chit amount are set when the scheme is created.' },
  { icon: Calendar, title: 'Contribute Each Cycle', text: 'Every member pays the scheme\u2019s fixed installment amount each cycle (weekly or monthly, depending on the scheme).' },
  { icon: Gavel, title: 'Auction or Fixed Payout', text: 'For auction-based schemes, members bid in a live oral auction each cycle. For fixed schemes, payouts follow a published schedule.' },
  { icon: Wallet, title: 'Receive Your Payout', text: 'The winning or scheduled member for that cycle receives the pooled amount, after any applicable commission.' },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="How Chit Works" description="A simple group savings and payout model, explained step by step." />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-border bg-white p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">Step {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-surface p-6 text-sm text-muted">
          Exact terms — installment amounts, cycle length, and whether a scheme is auction-based or fixed-payout — vary
          by scheme. See the <Link href="/chit-schemes" className="font-medium text-brand underline underline-offset-2">Chit Schemes</Link> page for published details on each one.
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <CtaLink href="/auction">See the Auction Process</CtaLink>
          <CtaLink href="/apply" variant="outline" className="!border-brand !text-brand hover:!bg-brand/5">Apply Now</CtaLink>
        </div>
      </Section>
    </>
  );
}
