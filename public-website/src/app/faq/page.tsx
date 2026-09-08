import type { Metadata } from 'next';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { FaqListClient } from '@/components/data/FaqListClient';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about NACHIYAR CHIT & FINANCE chit schemes, the auction process, and the mobile app.',
};

export default function FaqPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Frequently Asked Questions" />
      </Section>

      <Section>
        <FaqListClient />
      </Section>
    </>
  );
}
