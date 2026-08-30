# TrinityAI Business OS — Backend (Phase 1 scaffold)

This is the API scaffold described in the build spec's Section 4 engineering
rules: Node/TypeScript, Express, a service layer with validation, PostgreSQL
via Prisma, session auth, and role enforcement at the API layer.

**Status: scaffold, not yet wired to the frontend.** The frontend
(`../frontend`) currently runs entirely on an in-browser store so it's usable
standalone. This backend exists so Phase 2 can start from a real schema and
a working auth + cascade pattern instead of a blank repo.

## What's actually implemented here

- **Full Prisma schema** (`prisma/schema.prisma`) — every entity from Section
  4's core data model, each scoped by `companyId`, soft-deletable, audit
  timestamped, with an `isDemo` flag.
- **Session auth** (`src/routes/auth.ts`, `src/middleware/auth.ts`) —
  register/login/logout/me, bcrypt password hashing, `cookie-session`.
- **Role enforcement at the API layer** (`src/middleware/roles.ts`) — not
  just hidden buttons in the UI.
- **Three fully transactional reference services** — zod validation,
  company-scoped queries, each cascade running inside one `$transaction`
  with an `Activity` + `AuditLog` entry:
  - `src/services/leadService.ts` — Lead → Client + Contact + Deal
  - `src/services/dealService.ts` — Deal Won → Project + starter Tasks +
    draft Invoice
  - `src/services/invoiceService.ts` — Payment → Invoice status + Revenue
    ledger + upsell `AiInsight`
- **Every other resource has real CRUD** (`src/routes/crud.ts`, built on the
  generic factory in `src/lib/crudService.ts`): Clients, Projects, Tasks,
  Expenses, Revenue, Goals, Proposals, Services, Documents, Ad Campaigns,
  Users, AI Insights. List/get/create/update/soft-delete, company-scoped,
  role-guarded. **If a resource later needs custom validation or a
  multi-table cascade, graduate it out of the factory into its own service
  file** — copy `leadService.ts`, don't bolt more logic onto the factory.
- **Tests** (`src/services/__tests__/leadService.test.ts`, run with
  `npm test`) — mocks the Prisma client and asserts the convert-to-client
  cascade's transaction shape, field carry-forward, and error cases. Same
  pattern to copy for `dealService` and `invoiceService`.

## What's not done yet (Phase 3+)

- Tests for `dealService.markWon` and `invoiceService.recordPayment` (same
  mocked-Prisma pattern as `leadService.test.ts`).
- Route-level tests (e.g. `supertest` against the Express app) — current
  tests are service-layer only.
- Wiring the frontend's `lib/store.ts` to call this API instead of
  `localStorage` (swap the Zustand `persist` middleware for `fetch` calls;
  the store's shape already matches these models field-for-field apart from
  casing).
- Excel/CSV import endpoints (the frontend currently parses files client-side).
- Third-party integrations (Meta/Google Ads, Gmail, WhatsApp, Calendar,
  Razorpay/Stripe) — intentionally last, per the build spec's Section 6/9
  phase order.

## Running it locally

```bash
cp .env.example .env          # edit DATABASE_URL / SESSION_SECRET if needed
docker compose up -d          # starts Postgres on localhost:5432
npm install
npm run prisma:migrate        # creates tables from schema.prisma
npm run dev                   # starts the API on http://localhost:4000
npm test                      # runs the Vitest suite (mocked Prisma, no DB needed)
```

Then, from a REST client:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"companyName":"TrinityAI","name":"Founder","email":"founder@trinityai.com","password":"changeme123"}'
```

That call creates the Company + an OWNER user and returns a session cookie —
use it for subsequent requests (e.g. `GET /api/leads`, `POST /api/leads`,
`POST /api/leads/:id/convert`).

## Extending a new resource (e.g. Clients)

1. Copy `src/services/leadService.ts` → `src/services/clientService.ts`.
   Swap the Prisma model, adjust the zod schema to Client's fields.
2. Copy `src/routes/leads.ts` → `src/routes/clients.ts`, same swap.
3. Replace `clientsRouter` in `src/routes/stubs.ts` with the import from the
   new file, and mount it in `src/server.ts`.
4. If the resource has a cascade (e.g. Deal Won), model it as a single
   `prisma.$transaction` the same way `leadService.convertToClient` does —
   never as separate sequential writes, since a partial failure would leave
   inconsistent financial records.
