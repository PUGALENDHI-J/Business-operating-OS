import type { Metadata } from 'next';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/Layout';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { siteConfig, telHref, whatsappHref, mapsEmbedSrc } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with ${siteConfig.companyName} at ${siteConfig.address.line} — call ${siteConfig.phone} or send an enquiry online.`,
};

export default function ContactPage() {
  return (
    <>
      <Section tone="brand">
        <SectionHeading title="Contact Us" description="We're happy to answer any questions about our chit schemes." />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6">
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <span>{siteConfig.address.line}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-brand" />
                  <a href={telHref()} className="font-medium hover:text-brand">{siteConfig.phone}</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-brand" />
                  <a href={`mailto:${siteConfig.email}`} className="font-medium hover:text-brand break-all">{siteConfig.email}</a>
                </li>
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 shrink-0 text-whatsapp" />
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand">
                    Chat on WhatsApp
                  </a>
                </li>
              </ul>
            </div>

            {/*
              Google Maps embed (no API key required). NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              is read in lib/site-config.ts as a configuration placeholder for a
              richer, pin-accurate integration later, once exact coordinates are
              provided by the client — the free embed below works today without it.
            */}
            <div className="overflow-hidden rounded-2xl border border-border">
              <iframe
                title="NACHIYAR CHIT & FINANCE location"
                src={mapsEmbedSrc()}
                width="100%"
                height="320"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <EnquiryForm heading="Send Us a Message" submitLabel="Send Message" />
        </div>
      </Section>
    </>
  );
}
