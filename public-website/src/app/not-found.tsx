import type { Metadata } from 'next';
import { Section } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Section className="text-center">
      <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
      <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <CtaLink href="/">Back to Home</CtaLink>
        <CtaLink href="/contact" variant="outline" className="!border-brand !text-brand hover:!bg-brand/5">Contact Us</CtaLink>
      </div>
    </Section>
  );
}
