import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${siteConfig.companyName}.`,
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Privacy Policy" />
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Placeholder content.</strong> This page is a structural draft only. The specific commitments,
              retention periods, and legal terms of {siteConfig.companyName}&apos;s privacy policy have not been supplied
              and should be reviewed and finalized by the company&apos;s legal counsel before this page is published live.
              Nothing below should be treated as the company&apos;s confirmed policy.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground">
            <h2>1. Information We Collect</h2>
            <p>
              When you use this website — for example, by submitting an enquiry or application form — we may collect
              information you provide directly, such as your name, phone number, email address, and any message or
              scheme preference you share with us.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              Information submitted through this website is used to respond to your enquiry, follow up regarding chit
              scheme applications, and for related customer service purposes. <em>[Placeholder — the company should
              specify any additional uses, such as marketing communications, and confirm consent requirements.]</em>
            </p>

            <h2>3. Sharing of Information</h2>
            <p>
              <em>[Placeholder — the company should specify whether information is shared with any third parties,
              such as service providers, and under what circumstances.]</em>
            </p>

            <h2>4. Data Retention</h2>
            <p>
              <em>[Placeholder — the company should specify how long enquiry/application data is retained.]</em>
            </p>

            <h2>5. Your Rights</h2>
            <p>
              <em>[Placeholder — the company should specify what rights individuals have regarding their data under
              applicable law, and how to exercise them.]</em>
            </p>

            <h2>6. Contact Us</h2>
            <p>
              For questions about this policy, contact {siteConfig.companyName} at {siteConfig.phone} or{' '}
              {siteConfig.email}.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
