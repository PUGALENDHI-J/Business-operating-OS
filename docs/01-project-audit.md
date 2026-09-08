# NACHIYAR CHIT & FINANCE PVT LTD — Phase 1 Technical Audit

**Status:** Audit only. No code has been built. Nothing below authorizes Phase 2+ work.
**Inputs reviewed:** `nachiyar_chit.apk` (56.1 MB), `Nachiyar_Chit_Finance_14_Image_Professional_Presentation.pdf` (14 pages), project brief.

---

## A. What Currently Exists

**1. Company presentation (PDF, 14 pages) — usable as content source**
Confirmed company facts extracted directly from the material:
- Name: NACHIYAR CHIT & FINANCE PVT LTD, "Trusted Since 2018"
- Location: Velpadi, Vellore, Tamil Nadu
- Phone: 9043420099
- Email: nachiyarchitfinance@gmail.com
- Website printed on material: www.nachiyarchits.com (**not yet verified live — see Section F**)
- Tagline: "Save Together, Grow Together, Prosper Together"
- Scheme catalogue with named products: Silver Scheme, Gold Scheme A1/A2, Diamond Scheme A1/A2, Platinum Scheme, Honey Weekly Chit Scheme, SuperJet Chit Scheme — each with stated chit amounts, member counts, durations, and example payout/dividend tables.
- Auction terms stated: oral/live auction, no fixed chit amount, bidding capped at 30%, 5% formal commission.
- A "15 Days Interest-Free" facility on collected chit balance, up to 45% of amount paid.
- A photo of an "Official Mobile App" screen listing: Live Auction, My Schemes, Payments, Loan Request, Statements, Notifications, Support — presented as already available on Play Store/App Store.

This PDF is graphic-heavy marketing collateral, not a specification. All the numeric scheme tables in it are usable **only as illustrative examples already published by the client** — they are not to be treated as a source for new financial claims, and nothing beyond what's printed should be inferred (e.g., no APR/interest rate is stated anywhere, so none should ever be invented in the website/CRM).

**2. Mobile APK — inspected directly (binary teardown, no source supplied)**

| Item | Finding |
|---|---|
| Framework | Flutter (Dart AOT), Flutter embedding v2 |
| Package / Application ID | `com.example.chit_admin` — **this is the Flutter default placeholder ID, never customized** |
| App label | "Nachiyar Chit Fund" |
| Version | versionName `1.0.0`, versionCode `1` |
| Min/Target SDK | minSdk 24 (Android 7.0), targetSdk 36 |
| Signing | **Signed with the Android Debug key** (`CN=Android Debug, O=Android`) — this is a debug/dev build, not a Play-Store-ready release artifact |
| Internal Dart package name | `chitfund360` (per compiled `package:chitfund360/...` paths) — a generic project/template name unrelated to "Nachiyar" |
| Permissions declared | **Only** a self-defined `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. No `INTERNET`, no `CAMERA`, no `READ/WRITE_STORAGE`, no notification, no location permission is declared anywhere in the manifest. |
| Firebase | No Firebase SDK, no `google-services.json`, no FCM service, no `google_mobile_ads`/Firebase meta-data of any kind found |
| Push notifications | Not present — no messaging service, no notification channel setup found |
| Deep links | None — no custom scheme or host `<data>` entries in any intent-filter |
| Backend / API wiring | The `http` Dart package is compiled in, but **no base URL, hostname, IP, or API path constant was found anywhere in the compiled code** (checked for `http(s)://`, IPs, `localhost`, common hosting domains — nothing beyond Flutter's own doc links and `fonts.gstatic.com`) |
| Local storage | No `sqflite`, `hive`, or `shared_preferences` packages detected in the compiled binary |
| Data source in-app | A file compiled as `package:chitfund360/data/dummy_data.dart` is the actual data source for the UI |
| Explicit demo markers | Strings embedded verbatim in the compiled binary: `"Demo build"`, `"WhatsApp share (demo)"`, `"WhatsApp sent to 8 pending members"`, `"Member saved successfully (demo)"`, `"Photo selected (demo)"`, `"Company profile updated (demo)"`, a class literally named `DummyData` |
| Sample identities found in binary | `karthik.raja@example.com`, `admin@chitfund360.in` — placeholder people/domain, unrelated to the real business |

**Screen inventory recovered from the compiled Dart paths** (this is the actual UI scope of the APK, reconstructed from file paths since no source was supplied):
- Auth: splash, login, OTP, forgot password, role select
- Admin: dashboard, member list/profile/add, fixed-chit list/create, auction list/create/live, collections (entry/list/receipt), interest & loan, accounts (ledger, voucher, financial statements, create ledger), reports, settings, staff management
- Staff: dashboard, member screen, profile, reports
- Customer: customer view, cash request screen
- Shared: bottom-nav shell, company profile, glass-morphism themed widgets

**Conclusion on the APK:** This is a **UI/UX demo prototype** — well laid out and covering the right screen inventory for a chit-fund admin/staff/customer app — but it is **not wired to any backend**, uses **hardcoded dummy data**, was **never assigned a real package ID**, and is **signed with a debug key**, not a production release. It cannot be "integrated with" in the sense of calling an existing API, because there is no existing API behind it. Per the project's own instruction, this must be documented plainly:

> **APK-only integration limitation:** No backend, no API, no database, and no authentication scheme exists behind this APK. There is nothing to reverse-engineer an integration contract from. The APK function list is useful only as a **UI/feature reference** for what the client has already shown to customers/staff as "the app," which sets an expectation the new system should try to match or exceed.

**3. Project brief document** — a complete, well-structured scope document (not client-supplied technical spec, but usable as the working spec) covering 19 functional pillars, 10 build phases, and explicit engineering rules (no hardcoded secrets, no fabricated financial claims, client owns all production assets).

---

## B. What Can Be Reused

- **All copy, numbers, and scheme names from the PDF** — directly reusable as real content for the Chit Schemes / Scheme Details website pages, with the tables reproduced faithfully (not reinterpreted).
- **Contact details, address, and phone number** — reusable across website, CRM, and WhatsApp templates.
- **The APK's screen/feature inventory** — reusable as a functional checklist for the CRM's chit/auction/collections/accounts modules, since it tells us what the client already imagines the product should do.
- **The APK's visual language cues** (gold/maroon/premium palette, "glass card" styling, gradient buttons) — reusable as design direction to stay consistent with the client's existing brand presentation, which uses the same maroon-and-gold palette throughout.
- Nothing from the APK's **code, data layer, or auth flow** is reusable — it's UI scaffolding with mock data, not integrable logic.

---

## C. What Needs to Be Built (net-new)

Essentially the entire stack described in the brief is net-new development:
1. Central PostgreSQL database and schema (Section H)
2. Backend REST API with auth/RBAC (Section I)
3. Public marketing website (all 12 listed sections)
4. CRM (leads, customers, chit/group management, payments, auctions, staff, dashboard)
5. Role-based auth (Super Admin/Admin/Manager/Staff/Accountant/Read Only)
6. WhatsApp Business API integration and automated notification triggers
7. A real mobile app backend, and either a rebuild or a from-scratch reconnection of the existing Flutter UI to that backend (see Section J — this is a judgment call for the client)
8. Reports/analytics, audit logs, security hardening, deployment pipeline

None of this exists today in a usable form; the APK's dummy-data screens are the closest thing to a spec for #4 and #7.

---

## D. What Cannot Be Determined From Supplied Material

- Whether `www.nachiyarchits.com` currently resolves to a live site, and if so, what's on it (not fetched yet — needs live verification before assuming it's blank).
- Whether the debug-signed APK supplied is the **same** app currently listed on Google Play as "Official Mobile App" per the presentation, an older/internal build, or an unrelated prototype. The presentation implies a published app exists; the APK we have is a debug build with a placeholder package ID, which is inconsistent with something already live on the Play Store under the company's name.
- Whether a backend/database already exists somewhere that simply wasn't included in this handoff (the APK gives no evidence of one, but "no evidence in this binary" isn't proof none exists elsewhere).
- Real interest rates, penalty structures, KYC/regulatory requirements, or chit-fund licensing details (Chit Funds Act, 1982 compliance) — none of this is in the supplied material and none of it should be invented.
- Company registration/CIN, GST number, and any Nidhi/NBFC/chit-fund registration number — not in the presentation, likely required for a "Terms & Conditions"/"Privacy Policy"/footer compliance page.
- Actual current staff count, branch count (brief says "Branch management" but no second location is mentioned anywhere in the material — only Velpadi, Vellore is given).

---

## E. Missing Client Requirements

Before Phase 2 (database design) can be considered final, the client should confirm:
1. Is there really only one branch (Velpadi) today, or should branch management be built for a near-term multi-branch plan?
2. Should the 8 listed scheme families (Silver/Gold-A1/Gold-A2/Diamond-A1/Diamond-A2/Platinum/Honey Weekly/SuperJet) be modeled as fixed presets, or should staff be able to define arbitrary new schemes through the CRM?
3. Who currently handles collections and auctions physically today (paper ledger? existing spreadsheet? the debug APK?) — this affects migration/import needs.
4. Legal/compliance text for Terms & Conditions and Privacy Policy — needs to come from the client or their counsel, not be drafted from assumptions, given this is a regulated financial-services business.
5. Desired auth method for customers (mobile OTP vs. email/password vs. both) — the APK shows an OTP screen, suggesting OTP is the expected flow, but this needs explicit confirmation and an SMS/OTP provider decision.
6. Whether the existing debug APK's UI/UX should be treated as the target design for the new mobile app, or whether the mobile app is being redesigned from scratch alongside the web CRM.

---

## F. Missing Credentials / Access

Nothing in this list has been provided yet, and per the project's ownership rule, all of it must be provisioned under the **client's own accounts**, not a developer's personal accounts:
- Domain registrar / DNS access for `nachiyarchits.com` (or confirmation of the domain owner if it's not currently the client)
- Hosting/deployment target credentials (Vercel, VPS, etc. — not yet chosen)
- Supabase/PostgreSQL project (not yet created)
- Meta Business Account + WhatsApp Business API access (App ID, phone number ID, permanent access token, WABA ID) — **none of this exists yet**; this is a prerequisite for Phase 8, not something to fabricate a placeholder for
- Google Play Console access, if the existing Flutter app is genuinely already published (needs verification per Section D) and is to be updated rather than replaced
- Company registration numbers / compliance text for legal pages
- Email/SMTP or transactional email provider for the website's enquiry form and password-reset flows
- SMS/OTP provider if mobile OTP login is confirmed as required

---

## G. Recommended Architecture

The brief's proposed architecture is sound and is adopted as the working plan, with one clarification: the "Existing Mobile Application Integration" box in the diagram should currently be read as **"New Mobile Backend Development"**, since there is no existing backend to integrate with.

```
Public Website (Next.js)        CRM/Admin Dashboard (Next.js)
        \                              /
         \                            /
          Backend API (Node/Nest or similar, REST, /api/v1)
                        |
              Central PostgreSQL Database (Supabase or managed Postgres)
                        |
        -----------------------------------------
        |                                        |
Mobile App (Flutter — reconnect/rebuild)   WhatsApp Business API
```

Stack recommendation (matches brief's stated preference):
- Frontend (site + CRM): Next.js + TypeScript + Tailwind
- Backend: Node.js API (NestJS or Express+TypeScript), REST, versioned under `/api/v1`
- Database: PostgreSQL via Supabase (gives auth, storage, and Postgres in one place, but plain self-hosted Postgres is an equally valid fallback if the client prefers not to depend on Supabase)
- Mobile: keep Flutter as the client-side framework (matches the existing APK's stack, so the UI screens already built are not wasted), but the app needs a real package ID, real backend wiring, and a release-signed build before it can go anywhere near production

---

## H. Database Entities (proposed, pre-ERD)

Matches the brief's suggested entity list, trimmed to what's actually justified by the scheme structure seen in the presentation and the screens seen in the APK:

`users`, `roles`, `permissions`, `branches`, `staff`, `leads`, `customers`, `customer_documents`, `chit_schemes` (Silver/Gold/Diamond/Platinum/Honey Weekly/SuperJet as seed rows), `chit_groups`, `chit_members`, `installments`, `payments`, `payment_receipts`, `auctions`, `auction_bids`, `notifications`, `whatsapp_messages`, `whatsapp_templates`, `followups`, `activity_logs`, `audit_logs`, `settings`

Two additions worth flagging given what the APK screens implied (accounts/ledger/voucher/financial-statements screens):
- `ledgers` / `ledger_entries` / `vouchers` — if the client wants the accounts module the APK already shows (general ledger, vouchers, financial statements), that's a distinct sub-system from chit/payments and should be modeled separately. **This needs client confirmation (see Section E) before being finalized** — it may be out of scope for a v1 CRM.

A full ERD with field-level detail is Phase 2 work and is not produced here.

---

## I. API Architecture (proposed)

RESTful, versioned under `/api/v1`, matching the brief's example routes (auth, customers, payments, auctions, whatsapp, leads), with pagination/filtering/sorting on all list endpoints, JWT-based auth, and role checks per endpoint. No further detail is warranted until the database design (Phase 2) is locked, since API shapes should follow the schema, not precede it.

---

## J. Mobile Integration Strategy

Given Section A/D's findings, there are two honest paths — this is a decision for the client, not something to resolve unilaterally:

**Option 1 — Rebuild on the existing Flutter shell.**
Keep the Flutter codebase's screen structure (it's a reasonable, on-brand UI and matches the feature list in the presentation), assign a real package ID, wire it to the new backend API being built in Phase 3, add real auth/OTP, and replace `dummy_data.dart` with live API calls. Requires the Flutter **source code**, which has not been supplied — only the compiled APK. Decompiled Dart AOT code is not practically recoverable as editable source, so this path requires the client to provide the actual Flutter project repository.

**Option 2 — New mobile app development.**
Treat the mobile app as net-new development against the new backend, using the APK's screen list purely as a feature/design reference. This is viable immediately, with no dependency on locating the original source.

**Recommendation:** ask the client whether Flutter source exists (Section E, item 6) before committing engineering time to either path. If source isn't available within a reasonable window, Option 2 is the only realistic path and should be marked explicitly as **NEW DEVELOPMENT**, per the brief's own rule.

---

## K. WhatsApp Integration Strategy

No WhatsApp Business API access exists yet (Section F). Strategy, to be executed only once credentials exist:
1. Client creates/owns a Meta Business Account and WhatsApp Business Account, and generates a permanent system-user access token.
2. Backend stores `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_VERSION` as environment variables only — never in source.
3. Message templates (enquiry ack, payment reminder, overdue reminder, payment confirmation, auction reminder/notification, document reminder, follow-up reminder) must be pre-approved through Meta's template review before automated sends can go out — this has lead time and should be started early, in parallel with backend work, not left to Phase 8.
4. Build a thin internal `whatsapp_messages`/`whatsapp_templates` service in the backend so the CRM and any future channel share one outbound queue and one audit trail.

---

## L. Security Risks (current state)

Since nothing has been built yet, "current risk" mostly concerns the **existing APK artifact** and general project hygiene:
1. The supplied APK is a **debug-signed build** — if this is ever mistaken for or distributed as a production artifact, that's a real risk; debug builds can carry weaker protections and shouldn't reach end users.
2. The APK's placeholder package ID (`com.example.chit_admin`) means it has never been through a real release process — no evidence of ProGuard/R8 obfuscation review, no Play Integrity/App Signing setup.
3. No secrets are present in the APK (good — nothing to rotate), but that's simply because nothing is wired up yet, not evidence of good secret hygiene going forward.
4. Going forward: standard risks apply and are already captured correctly in the brief's Security section (hashing, JWT, RBAC, input validation, rate limiting, CORS/CSRF, injection/XSS prevention, secure uploads, audit logs, env vars, no secrets in git) — nothing to add beyond enforcing it in Phase 3 onward.

---

## M. Estimated Implementation Complexity

Rough sizing only — not a quote, and highly sensitive to answers from Section E:

| Phase | Relative complexity | Primary driver |
|---|---|---|
| 2 — DB design | Low–Medium | Depends on whether accounts/ledger module is in scope |
| 3 — API + auth | Medium | RBAC across 6 roles, OTP auth |
| 4 — CRM core | High | Largest surface area: leads, customers, chits, payments, auctions, staff |
| 5 — Website | Low–Medium | Mostly content + forms, content is already available from the PDF |
| 6 — Chit/payment/auction modules | High | Core business logic, needs correct handling of dividends/bidding/payouts matching the PDF's tables |
| 7 — Mobile integration | Medium (Option 2) / Unknown (Option 1, blocked on source availability) | |
| 8 — WhatsApp automation | Medium | Blocked on Meta approval lead time, not engineering effort |
| 9 — Reports/security/QA | Medium | |
| 10 — Deployment | Low–Medium | Depends on client's chosen hosting |

Overall: this is a multi-month, multi-phase build, consistent with the brief's own 10-phase structure — nothing here suggests it can be materially compressed without cutting scope.

---

## N. Phase-by-Phase Plan

Adopting the brief's 10 phases as-is (Audit → Database → API/Auth → CRM Core → Website → Chit/Payment/Auction → Mobile Integration → WhatsApp → Reports/Security/QA → Deployment). Phase 1 (this document) is complete. **No Phase 2 work should start until:**
1. The client has answered the open questions in Section E, and
2. The missing credentials/access in Section F have at least a provisioning plan (they don't all need to exist on day one, but Phase 8/10 will block without them), and
3. A decision is made on the mobile integration path in Section J.

---

*End of Phase 1 audit. Awaiting explicit approval before any Phase 2 (database/schema) work begins.*
