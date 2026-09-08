import type { Metadata } from 'next';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { SchemeListClient } from './SchemeListClient';

export const metadata: Metadata = {
  title: 'Chit Schemes',
  description: 'Explore our published chit schemes — Silver, Gold, Diamond, Platinum, and special auction-based schemes.',
};

export default function ChitSchemesPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Our Chit Schemes" description="Every scheme below reflects our currently published terms." />
      </Section>

      <Section>
        <SchemeListClient />
      </Section>
    </>
  );
}
