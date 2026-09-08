import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `Terms and conditions for ${siteConfig.companyName}.`,
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Terms & Conditions" />
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Placeholder content.</strong> This page is a structural draft only. {siteConfig.companyName} is a
              regulated chit-fund business, and its actual scheme terms, member obligations, and legal conditions must
              be drafted and confirmed by the company&apos;s legal counsel — not assumed from this website. Nothing
              below should be treated as a binding term of any scheme.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground">
            <h2>1. About These Terms</h2>
            <p>
              These terms and conditions govern your use of this website and any enquiry or application you submit
              through it. They do not constitute the full terms of any chit scheme, which are governed separately by
              the scheme&apos;s own subscription agreement and applicable law, including the Chit Funds Act, 1982.
            </p>

            <h2>2. Website Use</h2>
            <p>
              This website provides general information about {siteConfig.companyName}&apos;s published chit schemes.
              Scheme details shown here reflect the company&apos;s currently published terms; for binding scheme terms,
              please refer to the formal subscription documents provided at enrollment.
            </p>

            <h2>3. Enquiries and Applications</h2>
            <p>
              Submitting an enquiry or application through this website does not guarantee enrollment in a scheme.
              {' '}<em>[Placeholder — the company should specify its actual enrollment/approval process and any
              eligibility conditions.]</em>
            </p>

            <h2>4. No Financial Advice</h2>
            <p>
              Information on this website is provided for general information only and does not constitute financial
              advice. <em>[Placeholder — the company&apos;s counsel should confirm appropriate disclaimers given
              applicable chit-fund regulations.]</em>
            </p>

            <h2>5. Limitation of Liability</h2>
            <p>
              <em>[Placeholder — to be drafted by legal counsel.]</em>
            </p>

            <h2>6. Governing Law</h2>
            <p>
              <em>[Placeholder — to be confirmed by legal counsel, typically the courts having jurisdiction over
              {' '}{siteConfig.address.city}, {siteConfig.address.state}.]</em>
            </p>

            <h2>7. Contact Us</h2>
            <p>
              For questions about these terms, contact {siteConfig.companyName} at {siteConfig.phone} or{' '}
              {siteConfig.email}.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
