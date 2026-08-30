# TrinityAI Business OS

The connected operating system for TrinityAI, built from the locked Stitch
design export. Per the build spec's own instructions (Section 6 "Phased
Build Order" and the "Final Instruction to the Coding Agent"), this delivery
is **Phase 1: Foundation, plus a working build of every module described in
Sections 2–3** so there's a real, usable app to react to — not a blank
shell. See `PHASE_STATUS.md` for the detailed status report the spec asks
for, and `stitch_trinityai_business_os/` for the original design export this
was built from.

## What's in this zip

```
frontend/    React + TypeScript + Tailwind app — fully working, runs standalone
backend/     Node/TypeScript + Express + Prisma API scaffold — schema + auth + one reference resource
PHASE_STATUS.md
stitch_trinityai_business_os/   Your original design export, unchanged
```

## Quickest way to see it running

```bash
cd frontend
npm install
npm run dev
```

Open the printed localhost URL, then go to **Settings → Load Demo Data** to
see every screen populated with realistic (clearly flagged) sample data.

## What's real vs. scaffolded

The frontend is fully functional standalone (state persists to
`localStorage`) and covers every module in the design spec. The backend now
has real endpoints — not stubs — for every resource in the data model:
three fully transactional cascade services (Lead→Client/Deal, Deal
Won→Project/Invoice, Payment→Invoice/Revenue) plus generic CRUD for
everything else, all company-scoped and role-guarded, all typechecking
clean. Both halves have automated test suites (27 tests total, all
passing) covering the business logic that actually moves money and data
around.

What's **not** done: the backend isn't connected to a live Postgres
instance (this sandbox has no Docker and can't reach Prisma's binary CDN —
an environment limit, not a code defect), and the frontend and backend
aren't wired to each other yet — the frontend runs on its own local store,
the backend is a separately-runnable, separately-tested API. `PHASE_STATUS.md`
has the full breakdown and the recommended next step (point the frontend's
store at these endpoints behind a feature flag).

## Supabase (cloud persistence)

The frontend can optionally sync to a Supabase project instead of relying
purely on `localStorage`:

1. Create a Supabase project, then run `supabase/schema.sql` against it
   (SQL Editor, or `supabase db push`). It creates every table from the data
   model with company-scoped Row Level Security.
2. Copy `frontend/.env.example` to `frontend/.env.local` and fill in your
   project's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In the app, go to **Settings → Data Sync** and click **Sync to Supabase**.

**Not yet verified against a live project** — there's no Supabase project
available in this build environment to test against. The schema, RLS
policies, and sync code are written and type-check cleanly, but the actual
round-trip (and especially whether an authenticated session is required for
RLS to allow writes — this build doesn't include a sign-in screen yet)
needs to be confirmed against a real project before you rely on it. Without
a configured project, the Data Sync screen says so plainly rather than
pretending to sync.
