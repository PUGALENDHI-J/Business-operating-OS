'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone } from 'lucide-react';
import { Container } from '@/components/ui/Layout';
import { CtaLink } from '@/components/ui/Cta';
import { siteConfig, telHref } from '@/lib/site-config';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/chit-schemes', label: 'Chit Schemes' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/auction', label: 'Auction Process' },
  { href: '/benefits', label: 'Benefits' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-brand text-base font-bold text-white sm:h-11 sm:w-11">
            N
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-brand sm:text-base">NACHIYAR</span>
            <span className="block text-[10px] font-medium text-muted sm:text-xs">CHIT &amp; FINANCE PVT LTD</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium text-foreground/80 transition-colors hover:text-brand',
                pathname === link.href && 'text-brand',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={telHref()} className="flex items-center gap-1.5 text-sm font-semibold text-brand">
            <Phone className="h-4 w-4" /> {siteConfig.phone}
          </a>
          <CtaLink href="/apply" size="sm">Apply Now</CtaLink>
        </div>

        <button
          className="rounded-lg p-2 text-foreground lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <nav aria-label="Mobile" className="border-t border-border bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-surface hover:text-brand',
                  pathname === link.href && 'bg-surface text-brand',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border pt-4">
              <a href={telHref()} className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                <Phone className="h-4 w-4" /> {siteConfig.phone}
              </a>
            </div>
            <CtaLink href="/apply" className="mt-2 justify-center" onClick={() => setOpen(false)}>
              Apply Now
            </CtaLink>
          </Container>
        </nav>
      )}
    </header>
  );
}
