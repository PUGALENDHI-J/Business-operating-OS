// Every value here is either explicitly given ("Known verified
// information") in the Phase 5 brief, or copied verbatim from the
// company's own presentation material audited in Phase 1. Nothing here
// is invented. If a value the site needs isn't listed below, the
// relevant page shows an editable placeholder instead of a guess (see
// e.g. the address map query, which uses only the verified city/branch
// name, not a fabricated street address).

export const siteConfig = {
  companyName: 'NACHIYAR CHIT & FINANCE PVT LTD',
  tagline: 'Save Together, Grow Together, Prosper Together',
  trustedSince: 2018,
  address: {
    line: 'Velpadi, Vellore, Tamil Nadu',
    city: 'Vellore',
    state: 'Tamil Nadu',
    country: 'IN',
  },
  phone: '9043420099',
  phoneIntl: '+919043420099',
  email: 'nachiyarchitfinance@gmail.com',
  website: 'https://www.nachiyarchits.com',
  whatsapp: {
    number: '919043420099',
    defaultMessage: "Hi NACHIYAR CHIT & FINANCE, I'd like to know more about your chit schemes.",
  },
} as const;

export function whatsappHref(message?: string): string {
  const text = encodeURIComponent(message ?? siteConfig.whatsapp.defaultMessage);
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${text}`;
}

export function telHref(): string {
  return `tel:${siteConfig.phoneIntl}`;
}

/**
 * Free Google Maps embed (no API key required) centered on the verified
 * branch location. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is read here as a
 * configuration placeholder for a richer integration later (e.g. Places
 * Autocomplete on the enquiry form, a JS-API interactive map with a
 * precise pin once the client provides exact coordinates) — the site
 * works correctly today without that key.
 */
export function mapsEmbedSrc(): string {
  const query = encodeURIComponent(`${siteConfig.companyName}, ${siteConfig.address.line}`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
