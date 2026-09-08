import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Container } from '@/components/ui/Layout';
import { siteConfig, telHref } from '@/lib/site-config';

const EXPLORE_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/chit-schemes', label: 'Chit Schemes' },
  { href: '/how-it-works', label: 'How Chit Works' },
  { href: '/auction', label: 'Auction Process' },
  { href: '/benefits', label: 'Benefits' },
];

const SUPPORT_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/apply', label: 'Apply Now' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
];

export function Footer() {
  return (
    <footer className="bg-brand-dark text-white/80">
      <Container className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-brand-light text-base font-bold text-white">N</span>
            <span className="text-sm font-bold text-white">NACHIYAR CHIT &amp; FINANCE</span>
          </div>
          <p className="mt-4 text-sm italic text-gold-light">&ldquo;{siteConfig.tagline}&rdquo;</p>
          <p className="mt-2 text-xs text-white/60">Trusted since {siteConfig.trustedSince}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Explore</h3>
          <ul className="mt-4 space-y-2.5">
            {EXPLORE_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-sm hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Support</h3>
          <ul className="mt-4 space-y-2.5">
            {SUPPORT_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-sm hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {siteConfig.address.line}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-gold" /> <a href={telHref()} className="hover:text-white">{siteConfig.phone}</a></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-gold" /> <a href={`mailto:${siteConfig.email}`} className="hover:text-white break-all">{siteConfig.email}</a></li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10 py-5">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteConfig.companyName}. All rights reserved.</p>
          <p>Building Trust... Growing Together...</p>
        </Container>
      </div>
    </footer>
  );
}
