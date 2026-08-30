# TrinityOS — New Design System Upgrade

This upgrade re-skins and restructures your existing TrinityOS Business OS
(`frontend/`) to match the new Stitch design export
(`stitch_trinityos_business_intelligence_upgrade` design reference, not
included in this zip — this is the app you approved from it). Per your brief:
the OLD app's business logic, calculations, cascades, Supabase sync, and
test suite are untouched. Only the UI layer changed.

## What changed

**Design tokens (the highest-leverage change)**
- `frontend/src/index.css` and `tailwind.config.js` — full new color system:
  Geist font, `#FF5722` primary orange, light mode (light-gray/white cards)
  and dark mode (deep navy `#0B1C30` canvas, `#213145` cards) tuned to match
  the reference screens exactly. Because every existing component already
  read its colors from these tokens, this one change re-skinned nearly
  every screen in the app automatically.

**Navigation**
- `Sidebar.tsx` — rebuilt to the exact simplified list from the spec:
  Dashboard, Leads, Clients, Pipeline, Projects, Tasks, Finance, Reports,
  Settings, plus Quick Action / Help Center / Logout. Always a dark navy
  rail, in both light and dark theme, per the reference.
- `nav.ts` — trimmed to that same list. Every other module (Proposals,
  Services, Team, Marketing, Growth, AI Advisor, Documents) still has a
  working route — they're reachable from **Reports → More Tools** instead
  of cluttering the rail, so nothing was deleted.
- `Topbar.tsx` / `MobileBottomNav.tsx` — removed the duplicate "Add New"
  button (Quick Action now lives once, in the sidebar) and matched the
  mobile tab bar to the reference (Dashboard / Leads / Add / Clients /
  Finance).

**Flagship screens**
- **Client Profile** (`pages/crm/ClientProfile.tsx`) — rebuilt to match the
  reference layout: header with WhatsApp/Call/Add Payment, the 4-card
  financial summary (Total Project Value / Advance Paid / Total Paid /
  Balance Due), Requirement + Active Projects, Payment Progress + Payment
  History + Activity Timeline. All existing edit/save logic, payment
  recording, and follow-up scheduling is unchanged underneath.
- **Dashboard** — KPI row now shows the exact 8 metrics from the spec
  (Total Project Value, Total Collected, Total Outstanding, Revenue,
  Profit, New Leads, Active Clients, Active Projects), computed live from
  your data, no manual math.
- **Leads** — added a proper card layout for mobile (lead #, status,
  business, value, requirement, follow-up badge, WhatsApp/Call/View) via a
  new `renderMobileCard` option on the shared `DataTable`.
- **Clients** — same mobile card treatment (Total Project / Total Paid /
  Balance Due + WhatsApp/Call).
- **Pipeline** — deal cards now show the linked client's WhatsApp/Call/View
  quick actions.
- **Projects** — added an inline edit modal (status, progress, deadline,
  budget, next action) reachable by clicking any row, plus deep-linking
  from a Client Profile's project list.
- **Finance** — Revenue/Invoices/Expenses now share a sub-nav tab row
  (`FinanceSubNav.tsx`) so they read as one "Finance" module, matching the
  simplified sidebar.
- **Quick Action** — added Payment and Follow-up to the quick-add menu.

**Everywhere else** (Tasks, Reports, Settings, Documents, Marketing,
Growth, AI Advisor, Proposals, Services, Team) — unchanged in structure,
but automatically re-themed since they all use the same `AppShell` and
shared UI components.

## Verified

- `npx tsc -b` — clean, no type errors
- `npm run build` — production build succeeds
- `npx vitest run` — all 53 tests pass (one test's expectation was updated
  to reflect the new `success` status tone introduced for Won/Paid/
  Completed states, kept distinct from the generic `active` tone to match
  the reference's green/blue financial-indicator split)

## Not done in this pass

- Reports and Settings pages were reviewed but not visually redesigned
  beyond automatic re-theming (they aren't in the reference design set).
- No pixel-perfect pass on Tasks/Invoices/Expenses card layouts for
  mobile — they still use the generic stacked-column table on small
  screens rather than a bespoke card (Leads and Clients got the bespoke
  treatment since the spec calls them out specifically).
- Backend (`backend/`) and Supabase schema are untouched — this was purely
  a frontend UI/UX upgrade.

## Running it

```bash
cd frontend
npm install
npm run dev
```

Go to **Settings → Load Demo Data** to see every screen populated.
