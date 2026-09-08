import { Phone, MessageCircle } from 'lucide-react';
import { telHref, whatsappHref } from '@/lib/site-config';

export function FloatingCtaBar() {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      <a
        href={telHref()}
        aria-label="Call NACHIYAR CHIT & FINANCE"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105"
      >
        <Phone className="h-5 w-5" />
      </a>
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with NACHIYAR CHIT & FINANCE on WhatsApp"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
}
