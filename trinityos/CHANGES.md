# TrinityAI Business OS — Upgrade Notes

This pass focused on Priorities 1–5 from the spec: CRM data entry, Lead→Client
conversion, Client management, daily workflow, and the dark/light theme.
Nothing was rebuilt from scratch — existing routes, calculations, Zustand
persistence, and demo data all still work, and old localStorage data is
unaffected (every new field is optional).

## What changed

**Data model** (`src/types/index.ts`)
- `Lead`: added `lead_number`, `whatsapp`, `requirement`, `estimated_value`,
  `website`, `location` — all optional, so existing persisted leads still work.
- `Client`: added `client_number`, `contact_person`, `whatsapp`, `phone`,
  `email`, `requirement`, `project_value`, `advance_paid`, `total_paid`.
- `Project`: added `advance_paid`, `total_paid`, `requirements`.

**New utilities**
- `src/lib/numbering.ts` — generates `LEAD-0001` / `CLI-0001` style IDs.
- `src/lib/contact.ts` — `wa.me` / `tel:` / `mailto:` link builders with
  Indian phone normalization, plus validators.
- `src/lib/themeStore.ts` — persisted Light/Dark/System preference.

**Real dark/light/system theme**
- Every Tailwind color token now resolves to a CSS variable
  (`src/index.css`, `tailwind.config.js`) with a hand-tuned dark palette
  (deep charcoal/navy, elevated cards, muted secondary text, orange accent
  kept) — not an inversion. Because the tokens are shared, this re-themes
  the whole app (sidebar, tables, modals, drawers, charts, pills, forms)
  without editing every page individually.
- Toggle in the Topbar (☀/🌙) + full Light/Dark/System picker in
  Settings → Appearance. Persists across reloads via `localStorage`.

**New reusable components** (`src/components/ui/`)
- `Drawer.tsx` — right-side panel on desktop, full-screen on mobile.
- `EditableField.tsx` — inline View → Edit → Save for any field.
- `ContactActions.tsx` — WhatsApp / Call / Email quick buttons.

**Leads** (`src/pages/crm/LeadsList.tsx`, `src/components/crm/LeadDetailDrawer.tsx`)
- New Lead form uses progressive disclosure (5 fields up front, "+ More
  Details" reveals the rest).
- Every lead gets a `LEAD-0001` style ID; searchable by ID, name, business,
  phone, WhatsApp, requirement.
- Row-level WhatsApp / Call / Edit / Convert quick actions.
- Clicking a row opens a detail drawer with everything inline-editable.
- "Convert to Client" now shows a confirmation summary instead of instantly
  converting, and reuses every field already on the lead.
- `n` keyboard shortcut opens New Lead.

**Lead → Client cascade** (`src/lib/cascades.ts`)
- `convertLeadToClient` now carries WhatsApp, phone, email, requirement,
  estimated value, website, and location onto the new Client, and seeds the
  Deal's value from the lead's estimate — nothing is re-typed.

**Clients** (`src/pages/crm/ClientsList.tsx`, `src/pages/crm/ClientProfile.tsx`)
- Client IDs, contact person/WhatsApp/phone/email fields, quick actions in
  the list.
- Client profile: editable Financial Summary (Project Value, Advance
  Received, Balance Due, Paid % with a progress bar), a dedicated
  Requirements textarea, and inline-editable contact/location/website
  fields — all save immediately with a toast, no page reload.

**Dashboard** (`src/pages/Dashboard.tsx`)
- KPI cards are now clickable and navigate to the relevant module.
- New "Today's Actions" row: new leads, follow-ups today, overdue
  follow-ups, payments due, projects at risk, tasks due today — each
  clickable.

**Global search** (`src/lib/globalSearch.ts`)
- Now matches Lead ID / Client ID / phone / WhatsApp, not just name/email.

## Known limitation in this environment

The uploaded `node_modules` only include Windows-native bindings for the
Vite/Vitest/oxlint toolchain (Rolldown-based), and this sandbox has no
network access to reinstall the Linux bindings. I validated everything with
a full `tsc -b --noEmit` (clean, zero errors) and careful manual review
instead of an actual `npm run dev`/`vite build`/`vitest run`. On your own
machine, `npm install` (or `rm -rf node_modules package-lock.json && npm i`)
should pull the correct native binaries and `npm run dev` / `npm run build`
/ `npm test` should work normally.

## Not yet touched in this pass

Priority 6 "polish" items — Projects/Tasks/Invoices/Proposals list pages,
their own inline-edit affordances, deeper accessibility pass, and CSV/XLSX
import field expansion — still use the pre-upgrade UI. They already inherit
the dark theme automatically (same shared color tokens), but don't yet have
the drawer/quick-action treatment Leads and Clients got. Happy to continue
into those next.
