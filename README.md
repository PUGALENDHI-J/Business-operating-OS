# NACHIYAR CHIT & FINANCE PVT LTD — Digital Transformation Project

Deliverables through end of Phase 5.

## Contents

```
docs/                         Phase 1-5 deliverable documents
  01-project-audit.md          Phase 1: APK/PDF audit, findings, gaps
  02-system-architecture.md    Phase 1: recommended architecture + Mermaid diagram
  03-database-design.md        Phase 2: full schema design, ERD, validation notes
  04-api-specification.md      Phase 3: API conventions, modules, security checklist
  05-public-website.md         Phase 5: public site, public API, lead-capture flow

database/                     PostgreSQL schema (Phase 2 + Phase 3 + Phase 5 additions)
  migrations/                  0001-0012, numbered, apply in order
  seeds/
    dev_seed.sql                dev-only fictional data
    website_content_seed.sql    safe for any environment — scheme slugs/highlights and
                                 FAQ content sourced only from the company presentation

backend-api/                  Phase 3 + 5: Node.js/TypeScript/Express REST API
  src/modules/                  auth + 13 authenticated modules + public/ (Phase 5, no auth)
  tests/                        Jest + Supertest suite (52 tests)
  .env.example
  package.json

crm-frontend/                 Phase 4: Next.js CRM, wired to the real API
  src/app/(dashboard)/          all 16 CRM pages
  .env.example
  package.json

public-website/               Phase 5: Next.js public marketing site
  src/app/                      all 11 required pages + sitemap.xml + robots.txt
  src/components/data/          client-side data-fetching components (see note below)
  .env.example
  package.json
```

## Setting up the backend locally

```bash
# 1. PostgreSQL database
createuser nachiyar_dev --pwprompt
createdb nachiyar_chit -O nachiyar_dev

# 2. Apply migrations IN ORDER
cd database/migrations
for f in $(ls *.sql | sort); do
  psql -h localhost -U nachiyar_dev -d nachiyar_chit -v ON_ERROR_STOP=1 -f "$f"
done

# 3. Seed data
#    dev_seed.sql is fictional dev-only data; website_content_seed.sql is
#    real published content (scheme slugs/highlights, FAQ text) safe for
#    any environment, including production.
psql -h localhost -U nachiyar_dev -d nachiyar_chit -f ../seeds/dev_seed.sql
psql -h localhost -U nachiyar_dev -d nachiyar_chit -f ../seeds/website_content_seed.sql

# 4. Backend API
cd ../../backend-api
npm install
cp .env.example .env    # edit with real DB credentials, JWT secrets, and CORS origins
                         # for BOTH the CRM and the public website
npm run build
npm start                # or: npm run dev
npm test                 # run against a separate nachiyar_chit_test DB — see docs/04 §7
```

## Setting up the CRM frontend locally

```bash
cd crm-frontend
npm install
cp .env.example .env.local   # defaults to http://localhost:4000/api/v1
npm run build
npm start
```

Sign in with a dev seed staff account, e.g. phone `9000000001`, password `devpassword123`.

## Setting up the public website locally

```bash
cd public-website
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL, optional Maps key
npm run build
npm start                     # defaults to port 3000; run alongside the CRM on a different port
```

No login needed — this site is public. Submitting the enquiry/apply form creates a real lead
in the same database the CRM reads from (`source = 'website'`), visible immediately on the
CRM's Leads page.

## What's real vs. what's still a gap

- The database schema, migrations, and seed data are real and validated against a live PostgreSQL instance.
- The backend API (including the new Phase 5 public routes) is real, working code. `lint`, `typecheck`, `build`, and all 52 automated tests pass, run twice consecutively with no DB reset to confirm idempotency.
- The CRM frontend is real, working code, verified end-to-end against the live API.
- The public website is real, working code. `lint`, `typecheck`, and `build` all pass with zero errors/warnings, and the full "Website → API → CRM → Lead" flow was verified end-to-end: a real form submission through the public API showed up correctly in the CRM's authenticated leads list, with the interested scheme correctly resolved by name.
- **A genuine build-time environment bug was found and fixed during Phase 5** (documented in detail in `docs/05-public-website.md` §7): this Next.js canary release's server-side `fetch()` during static generation is broken in this environment. The fix — client-side data fetching for every page needing live content — is the same pattern already proven reliable in the CRM, not a shortcut; static pages with no data dependency remain fully server-rendered.
- Two Phase-1-flagged gaps remain honest placeholders by design, not oversights: `/privacy` and `/terms` carry a visible banner stating the legal content is a structural draft pending the company's actual legal counsel — nothing there should be treated as binding.
- The mobile app integration, WhatsApp *sending* (templates/log exist; no send capability), and production deployment are all future phases per the original brief and have not been started.
- No real WhatsApp Business API, SMS/OTP provider, exact street-level map coordinates, or production hosting credentials exist yet (see `docs/01-project-audit.md`, sections F/12) — this remains true as of Phase 5.

## Security notes

- No real secrets are included anywhere in this package. Every `.env.example` file lists required environment variables with placeholder values only.
- Every password in `dev_seed.sql` is the obviously-fake `devpassword123`, for local development only.
- The public website's only write endpoint (`POST /api/v1/public/leads`) is unauthenticated by necessity (anonymous visitors can't hold a JWT) but is protected by its own tight rate limit, a honeypot field, and full server-side validation — verified to reject spam-shaped submissions without persisting them.
