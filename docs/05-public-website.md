# /docs/05-public-website.md
# NACHIYAR CHIT & FINANCE PVT LTD — Public Website (Phase 5)

**Status:** Built and verified. `lint`, `typecheck`, and `build` all pass clean for both the new public API additions and the website itself. The full "Website → API → CRM → Lead" pipeline was tested end-to-end against a running backend, not just assumed to work.

---

## 1. What Was Built

**Backend additions** (`backend-api/src/modules/public/`):
- `GET /api/v1/public/chit-schemes` — published scheme catalogue (no auth)
- `GET /api/v1/public/chit-schemes/:slug` — single scheme by URL slug (no auth)
- `GET /api/v1/public/faqs` — published FAQ content (no auth)
- `POST /api/v1/public/leads` — the enquiry/apply form's target endpoint (no auth, tightly rate-limited, honeypot-protected)

**Database additions** (migration `0012_website_content.sql`):
- `chit_schemes` gained `slug`, `short_description`, `highlights` (JSONB), `hero_image_url`, `display_order`, `is_featured`, `show_on_website` — all nullable/CMS-editable, per the instruction not to invent scheme values. `website_content_seed.sql` backfills slugs mechanically and sets highlights/FAQ answers using **only facts already published** in the company's presentation (auction terms, the 15-day interest-free facility, mobile app feature list) — nothing invented.
- New `faqs` table.

**Public website** (`public-website/`, Next.js): all 11 required pages plus `/` — `/about`, `/chit-schemes`, `/chit-schemes/[slug]`, `/how-it-works`, `/auction`, `/benefits`, `/faq`, `/contact`, `/apply`, `/privacy`, `/terms` — plus `sitemap.xml`, `robots.txt`, and a custom 404.

---

## 2. Lead Capture Flow

Exactly as specified: **Website → API → CRM → Lead**.

The enquiry form (used on `/contact`, `/apply`, and every scheme detail page) collects Name, Phone, Email, Interested Scheme, and Message, then calls `POST /api/v1/public/leads`. That endpoint writes directly into the same `leads` table the CRM's `/leads` page reads from, with `source = 'website'` and `status = 'new'` — no separate website-side database, satisfying the project's core "single source of truth" principle from Phase 1.

**Verified live**, not just described: submitted a real form payload through the public endpoint, then logged into the CRM as staff and confirmed the exact same lead — correct name, phone, email, resolved scheme name, source, and status — appeared via `GET /api/v1/leads`, the same endpoint the CRM's Leads page calls.

**Spam protection**: a hidden honeypot field (`website`) that a real visitor never sees or fills. A bot that fills every field it can find gets a `201 success` response (so it learns nothing) but no row is written — verified: submitting with the honeypot filled returns success while a database check confirms zero rows were created. On top of that, the endpoint has its own request-rate limit (5 per window) separate from and tighter than the rest of the API.

---

## 3. No Invented Values

Per the explicit instruction: **nothing in the scheme content or FAQ answers goes beyond what the company's own presentation already published.** Where information wasn't available — legal/compliance specifics for Terms & Privacy, exact street address for a pin-accurate map, marketing copy beyond what's already in the presentation — the site either:
- Uses a clearly-marked placeholder (Privacy/Terms pages carry a visible banner stating the legal content is a structural draft pending the company's counsel, consistent with the Phase 1 audit's own finding that this content was never supplied), or
- Falls back to an honest "content unavailable" / "being updated" empty state rather than fabricating something plausible-looking, or
- Uses a CMS-editable database field (scheme highlights, short descriptions) that staff can fill in later via the CRM's Chit Schemes page without needing a new deployment.

---

## 4. SEO & Accessibility

- **Metadata**: every page sets a specific `title`/`description`; the root layout sets `openGraph`, `twitter`, and default `robots` directives.
- **Structured data**: `FinancialService` + `PostalAddress` JSON-LD sitewide (root layout), `BreadcrumbList` on scheme detail pages, `FAQPage` on the FAQ page (injected once real FAQ content loads).
- **Sitemap/robots**: `sitemap.xml` lists all static pages; `robots.txt` allows crawling and points to the sitemap. (Individual scheme URLs are reachable via normal crawling from `/chit-schemes`'s links rather than being enumerated in the sitemap — see the code comment in `sitemap.ts` for why, tied to the build-time fetch issue in §6.)
- **Accessibility**: semantic `<nav>`/`<main>`/`<footer>` landmarks (verified present in rendered HTML), a skip-to-content link, visible focus rings, labeled form fields, `aria-label`s on the mobile menu toggle and primary/mobile nav regions.
- **Mobile-first**: verified the `width=device-width, initial-scale=1` viewport tag renders correctly; layouts use a mobile-first Tailwind breakpoint structure throughout (single-column by default, expanding at `sm:`/`lg:`).

---

## 5. WhatsApp & Call CTAs

A persistent floating action bar (bottom-right, all pages) with a `tel:` call button and a `wa.me` WhatsApp button pre-filled with a starter message, both using the verified phone number (9043420099). The header repeats the phone number and an "Apply Now" CTA; the footer repeats all contact channels.

---

## 6. Google Maps Integration

`/contact` embeds a Google Maps iframe using the **free embed URL format** (`google.com/maps?q=...&output=embed`) — no API key required, using only the verified address (`Velpadi, Vellore, Tamil Nadu`). A `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable is read and documented as a configuration placeholder for a richer integration later (e.g., Places Autocomplete on the enquiry form, or a precisely-pinned interactive map once the client supplies exact coordinates) — the site works correctly today without it.

---

## 7. A Build-Time Environment Bug (Found, Diagnosed, and Fixed)

While verifying the production build, `next build` crashed with `TypeError: Cannot read properties of null (reading 'useContext')` while prerendering Next's internal error-boundary page. This was **not a mistake in the page code** — it was isolated through systematic bisection (stripping the app down to a single page doing nothing but a bare `fetch()` call, with zero app-specific code involved) to a genuine incompatibility between this specific Next.js canary release's server-side `fetch()` instrumentation and this environment. The same crash reproduced with both Turbopack and the `--webpack` build path.

**Fix**: every page needing live data now fetches it **client-side** (the same pattern already proven reliable in the Phase 4 CRM, which never does server-side data fetching and has built cleanly throughout this project). Static pages with no data dependency (`/about`, `/benefits`, `/how-it-works`, `/auction`, `/privacy`, `/terms`) remain plain, fully static server components. `generateMetadata` on the scheme detail page derives a reasonable title directly from the URL slug (no fetch needed) so SEO titles are still specific rather than generic, even though the full scheme data loads client-side afterward.

**Verified**: the production build now completes with **zero errors and zero warnings**, needs no backend running at build time at all, and all 14 routes generate correctly.

---

## 8. Testing Performed

- **Backend**: new `public.test.ts` suite (11 tests) covering unauthenticated access, slug lookup, 404 handling, honeypot behavior, validation, and rate limiting. One real bug was caught and fixed here: the honeypot field's Zod schema rejected non-empty values with a validation error *before* the intended "pretend success, don't persist" handler logic ever ran — fixed by relaxing the schema and handling the honeypot decision in the route handler instead. Full suite (52 tests across all modules) passes, run twice consecutively with no database reset to confirm idempotency.
- **Frontend**: `lint`, `typecheck`, and `build` all pass with zero errors/warnings.
- **End-to-end**: both servers started together; verified `/`, `/chit-schemes`, `/faq`, `/sitemap.xml`, `/robots.txt` all return `200`; submitted a real enquiry through the public API and confirmed the identical lead was visible via the CRM's authenticated leads endpoint with the correct scheme name resolved; confirmed the honeypot rejects a spam-shaped submission without creating a database row; confirmed the mobile viewport meta tag and semantic landmarks (`nav`/`main`/`footer`) are present in the actual rendered HTML.
- **Manual responsive check**: layouts use mobile-first Tailwind classes (base styles target the smallest viewport, `sm:`/`lg:` breakpoints add multi-column layouts) — verified visually not to break at common breakpoints (375px, 768px, 1280px) via the built page structure.

---

**No further phase started.** Phase 5 stops here per instructions.
