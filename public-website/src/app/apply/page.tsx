import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { siteConfig, telHref } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Apply Now',
  description: `Apply to join a NACHIYAR CHIT & FINANCE chit scheme. Submit your details and our team will follow up.`,
};

const WHAT_HAPPENS_NEXT = [
  'Our team reviews your application and interested scheme.',
  'A staff member contacts you to confirm scheme details and answer questions.',
  'Once confirmed, you complete enrollment at our office or as guided by our team.',
];

export default function ApplyPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Apply Now" description="Tell us a little about yourself and which scheme interests you — we'll take it from there." />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EnquiryForm heading="Application Details" submitLabel="Submit Application" />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground">What happens next?</h3>
              <ul className="mt-4 space-y-3">
                {WHAT_HAPPENS_NEXT.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-white p-6">
              <p className="text-sm text-muted">Prefer to talk first? Call us directly.</p>
              <a href={telHref()} className="mt-2 block text-lg font-semibold text-brand">{siteConfig.phone}</a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
