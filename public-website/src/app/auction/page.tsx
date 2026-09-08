import type { Metadata } from 'next';
import { Gavel, Percent, ShieldCheck, Users2 } from 'lucide-react';
import Link from 'next/link';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';

export const metadata: Metadata = {
  title: 'Auction Process',
  description: 'How the live oral auction works for auction-based chit schemes at NACHIYAR CHIT & FINANCE.',
};

const TERMS = [
  { icon: Gavel, title: 'Live Oral Auction', text: 'Auction-based schemes are settled through a live oral auction — not a fixed, pre-decided allotment.' },
  { icon: Percent, title: 'Bidding Capped at 30%', text: 'Members may bid up to a maximum of 30% of the chit value in the auction.' },
  { icon: ShieldCheck, title: '5% Formal Commission', text: 'A 5% formal commission applies as per company policy on auction-based schemes.' },
  { icon: Users2, title: 'Open Member Participation', text: 'All members of the group are eligible to participate in the auction for that cycle.' },
];

export default function AuctionPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Auction Process" description="How the auction works for our auction-based chit schemes." />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {TERMS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-border bg-white p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-surface p-6 text-sm text-muted">
          These terms apply to our auction-based schemes specifically (e.g. Diamond, Platinum, and special schemes).
          Not every scheme we offer is auction-based — see the <Link href="/chit-schemes" className="font-medium text-brand underline underline-offset-2">Chit Schemes</Link> page
          to check whether a particular scheme uses the auction process or a fixed payout schedule.
        </div>

        <div className="mt-10">
          <CtaLink href="/chit-schemes">View Auction-Based Schemes</CtaLink>
        </div>
      </Section>
    </>
  );
}
