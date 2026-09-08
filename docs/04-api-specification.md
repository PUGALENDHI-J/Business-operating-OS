# /docs/04-api-specification.md
# NACHIYAR CHIT & FINANCE PVT LTD — API Specification (Phase 3)

**Status:** Backend foundation built and verified against a live PostgreSQL 16 instance. `lint`, `typecheck`, `build`, and the automated test suite (29 tests, run twice consecutively without a database reset to confirm idempotency) all pass clean. No frontend/UI work is part of this phase.

**Base URL:** `/api/v1`
**Stack:** Node.js, TypeScript, Express 5, PostgreSQL (via `pg`, no ORM), Zod validation, JWT auth, bcrypt password hashing.

---

## 1. Conventions

**Success envelope**
```json
{ "data": { ... } }
```
or, for list endpoints:
```json
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "totalItems": 42, "totalPages": 3 } }
```

**Error envelope** (every error, every endpoint)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request failed validation", "details": [ ... ] } }
```

| HTTP | code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request not caught by schema validation |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token, or bad credentials |
| 403 | `FORBIDDEN` | Authenticated, but missing the required permission |
| 404 | `NOT_FOUND` | Resource does not exist (or is soft-deleted) |
| 409 | `CONFLICT` | Business-rule conflict (e.g. duplicate, over-payment, already-completed auction) |
| 422 | `VALIDATION_ERROR` | Request body/query/params failed Zod validation, or violated a DB-level CHECK/FK constraint |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled error (logged server-side, never leaks internals to the client) |

**Pagination/search/sort** — every list endpoint accepts:
`?page=1&pageSize=20&search=<text>&sortBy=<column>&sortDir=asc|desc`
`sortBy` is whitelisted per-endpoint against real columns (never interpolated raw) to prevent SQL injection via `ORDER BY`.

**Auth header:** `Authorization: Bearer <accessToken>` on every endpoint except `/auth/login`, `/auth/refresh`, `/auth/password-reset/*`.

---

## 2. Authentication & Authorization

### Login flow
1. `POST /auth/login` `{ phone, password }` → `{ accessToken, refreshToken, user }`. Access token expires in 15 minutes; refresh token in 7 days (both configurable via env).
2. Every subsequent request sends the access token in the `Authorization` header.
3. `POST /auth/refresh` `{ refreshToken }` → a new token pair. The old refresh token is immediately revoked (**rotation**); reusing it triggers automatic revocation of *every* active session for that user, since reuse of a rotated-out token is a signal of possible theft.
4. `POST /auth/logout` `{ refreshToken }` → revokes that one session (204, no body).

### RBAC — how it actually works
Authorization is **not** hardcoded per-role in route code anywhere. Every route declares only a `(module, action)` pair, e.g. `authorize('payments', 'write')`. On every request, `authenticate` middleware loads the caller's current roles → permissions straight from the database (`user_roles` → `role_permissions` → `permissions`, all built in Phase 2) and attaches the resulting permission set to `req.user`. This means:
- Revoking a role takes effect on the **very next request** — permissions are never cached in the JWT.
- The six roles from the brief (Super Admin, Admin, Manager, Staff, Accountant, Read Only) are just rows with different permission grants (see `/database/migrations/0011_permission_matrix.sql` for the exact matrix) — adding a seventh role later needs no code change, only new database rows.

**Never trust the frontend for this** — every list/create/update/delete route in every module below is wrapped in `authenticate` + `authorize(module, action)` server-side. A UI that hides a button is a UX nicety, not a security boundary; the API enforces it independently in every case.

### Password reset
1. `POST /auth/password-reset/request` `{ phone }` → always returns the same generic message regardless of whether the phone is registered (prevents account enumeration). In non-production environments only, the response also includes `devToken` so the flow is testable without a real SMS/email provider (Phase 1 audit confirmed none exists yet) — **production must never expose this field**, and the code only returns it when `NODE_ENV !== 'production'`.
2. `POST /auth/password-reset/confirm` `{ token, newPassword }` → sets the new password hash, marks the token single-use, and **revokes every active session** for that user as a precaution.
3. `POST /auth/change-password` (authenticated) `{ currentPassword, newPassword }` for a logged-in user changing their own password.

### Session/token storage (new in this phase — see migration `0010_auth_tokens.sql`)
- `refresh_tokens`: one row per session, storing only `SHA-256(token)` — never the raw JWT. Supports rotation (`replaced_by_token_id`) and revocation (`revoked_at`) without deleting history.
- `password_reset_tokens`: single-use, time-limited, same hash-only storage.

### What's never exposed
`password_hash` is never selected into any API response, anywhere, by construction — every module's `SELECT` column list is explicit and hand-written (no `SELECT *` reaching a response). Confirmed in the auth test suite (`JSON.stringify(response).not.toMatch(/password/i)`).

---

## 3. Modules

For every module below: **list** supports pagination/search/sort; **get** returns 404 if missing/soft-deleted; **create/update** validate with Zod before touching the database; **delete** is soft (sets `deleted_at`) except where the underlying table has none (financial/audit tables, per the Phase 2 design — deletion there is refused by the schema itself, not just the API).

| Module | Base path | Permission module | Notes |
|---|---|---|---|
| Auth | `/auth` | n/a (see above) | |
| Users | `/users` | `users` | Read-only listing + deactivate. Accounts are created via Staff or Customer flows, not directly. |
| Staff | `/staff` | `staff` | `POST /staff` creates a linked `users` row + `staff` profile + role assignments **in one transaction** — a staff member without a login or without a role is never a reachable state. |
| Branches | `/branches` | `branches` | Plain CRUD. |
| Leads | `/leads` | `leads` | `status` enum matches the brief exactly (`new, contacted, interested, follow_up, converted, lost`). `PATCH` refuses `status: 'converted'` directly — that only happens via... |
| | `POST /leads/:id/convert` | `leads` (write) | Atomically creates the linked `customers` row and marks the lead converted. Rejects a lead that's already converted. |
| Customers | `/customers` | `customers` | Base CRUD, plus every profile tab needed by the CRM: |
| | `GET /customers/:id/documents`, `POST .../documents`, `PATCH /customers/documents/:id/review` | `customers` | Document upload + staff-only verify/reject workflow. |
| | `GET /customers/:id/chit-memberships` | `customers` (read) | |
| | `GET /customers/:id/payments` | `customers` (read) | Full payment history with receipt numbers. |
| | `GET /customers/:id/outstanding` | `customers` (read) | Live-computed sum of `due_amount − paid_amount` across non-waived installments, split into total outstanding vs. specifically overdue. |
| | `GET /customers/:id/auctions` | `customers` (read) | |
| | `GET /customers/:id/followups` | `customers` (read) | |
| | `GET /customers/:id/whatsapp-history` | `customers` (read) | Currently always empty in practice — no real WhatsApp sending exists yet (see §5). |
| | `GET /customers/:id/activity` | `customers` (read) | |
| Chit Schemes | `/chit-schemes` | `chit_schemes` | Plain CRUD. The Phase 2 `chit_amount = installment_amount × member_count` CHECK constraint still applies — an invalid scheme is rejected with `422` before it ever reaches the schemes table. |
| Chit Groups | `/chit-groups` | `chit_groups` | Plain CRUD, `status` transitions (`pending/active/completed/cancelled`), `current_cycle` tracking. |
| Chit Members | `/chit-members` | `chit_members` | `POST` is the interesting one: joining a customer to a group **also generates that member's entire installment schedule** (one row per cycle, due dates computed from the scheme's frequency/duration) in the same transaction. Rejects if the group is already at `member_count`. |
| Installments | `/installments` | `installments` | Read-only plus one narrow write: `PATCH .../:id` only accepts `status: 'waived'` — every other status transition must come from the Payments module, so `paid_amount` can never drift out of sync with actual payments. |
| Payments | `/payments` | `payments` | `POST` records a payment **transactionally**: locks the installment row (`FOR UPDATE`), rejects any amount that would exceed the remaining balance (`409`), updates `paid_amount`/`status`, and generates a sequential receipt — all or nothing. `POST /payments/:id/reverse` marks a payment `reversed` (never deleted) and rolls the installment's balance back accordingly; reversing an already-reversed payment is rejected. |
| Auctions | `/auctions` | `auctions` | `POST /:id/bids` records/updates a member's bid and moves the auction to `live` on its first bid. `POST /:id/complete` computes the prize (`chit_amount − bid_discount − commission`) and commission from the scheme's own numbers — **the caller cannot supply an arbitrary payout**, only pick which already-placed bid won — then flags exactly one winning bid (the database's partial unique index makes a second winner impossible even if application logic had a bug) and advances the group's `current_cycle`. |
| Notifications | `/notifications` | `notifications` | Always scoped to the caller (`recipient_user_id = req.user.id`) — there is no "list anyone's notifications" endpoint. Read/mark-read only; creation is internal (triggered by other modules in a later phase, not exposed as a public "create notification for X" endpoint). |
| WhatsApp | `/whatsapp/templates`, `/whatsapp/messages` | `whatsapp` | **Templates**: full CRUD (managing the registry of templates pending/approved with Meta). **Messages**: read-only log. Per this phase's explicit instructions, **there is no send endpoint** — `POST /whatsapp/messages/send` does not exist. Sending is Phase 8 work, gated on the client actually provisioning a Meta Business/WhatsApp Business Account (still not done as of the Phase 1 audit). |

---

## 4. Request/Response Examples

**Login**
```
POST /api/v1/auth/login
{ "phone": "9000000001", "password": "devpassword123" }

200 →
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { "id": "...", "fullName": "Dev Admin One", "phone": "9000000001", "userType": "staff", "roles": ["Super Admin"] }
  }
}
```

**Recording a payment**
```
POST /api/v1/payments
Authorization: Bearer <token>
{ "installment_id": "90000000-...-000004", "amount": 4000, "payment_method": "cash" }

201 →
{
  "data": {
    "id": "...", "amount": "4000.00", "payment_method": "cash", "status": "success",
    "cycle_number": 2, "due_amount": "10000.00", "receipt_number": "RCPT-000004", ...
  }
}
```

**Over-payment rejected**
```
POST /api/v1/payments  { "installment_id": "...", "amount": 999999, "payment_method": "cash" }

409 →
{ "error": { "code": "CONFLICT", "message": "Payment of 999999 would exceed the remaining balance of 6000.00 on this installment" } }
```

**Forbidden (Staff role attempting a chit-scheme write)**
```
POST /api/v1/chit-schemes  Authorization: Bearer <staff-token>

403 →
{ "error": { "code": "FORBIDDEN", "message": "Missing permission: chit_schemes:write" } }
```

**Completing an auction**
```
POST /api/v1/auctions/:id/complete
{ "winning_chit_member_id": "80000000-...-000002" }

200 →
{ "data": { "status": "completed", "winning_bid_percent": "30.00", "prize_amount": "65000.00", "commission_amount": "5000.00", ... } }
```
(For a ₹1,00,000 Gold Scheme A1 group with 5% commission: `100000 − 30000 (30% bid) − 5000 (5% commission) = 65000`.)

---

## 5. What This Phase Deliberately Does Not Do

- **No WhatsApp sending.** Templates and the message log are modeled and API-accessible; there is no code path that calls Meta's Graph API. Per Phase 1's audit, no Meta Business/WhatsApp Business Account exists yet regardless.
- **No frontend.** This is API-only; Phase 4 (CRM) is a separate, subsequent effort.
- **No production secrets.** `.env.example` documents every variable; the committed `.env` used for local dev/test contains only obviously-fake development values, never anything resembling a production credential.
- **No email/SMS delivery.** Password reset tokens are generated and stored correctly, but actually texting/emailing them to a user requires a provider decision that hasn't been made (Phase 1 audit, §12) — non-production environments surface the token directly in the API response instead, clearly gated on `NODE_ENV`.

---

## 6. Security Checklist (implemented this phase)

- [x] Password hashing — bcrypt, configurable salt rounds (12 in production config, lower only in the test env for speed)
- [x] JWT access + refresh tokens, refresh rotation with reuse detection
- [x] Password reset — token-based, single-use, hash-only storage, time-limited
- [x] RBAC — enforced server-side on every route, backed by real DB tables, never cached past a single request
- [x] Input validation — Zod on every body/query/param
- [x] Centralized error handling — no stack traces or internals ever reach the client; Postgres constraint violations (`23505` unique, `23514` check, `23503` FK) are translated to clean 409/422s
- [x] Rate limiting — general API limit plus a tighter limit specifically on `/auth/*`
- [x] CORS — explicit origin allow-list from env, not a wildcard
- [x] Secure headers — `helmet` (CSP, HSTS, X-Frame-Options, etc.)
- [x] Structured logging — `pino`, with `Authorization` headers and any `password`/`token` fields redacted at the logger level
- [x] Environment configuration — all secrets/config via env vars, `.env.example` provided, real `.env` gitignored
- [x] No secrets/passwords/tokens in any API response — enforced by explicit column selection everywhere, verified by test assertion

---

## 7. Verification Performed

- `npm run typecheck` — clean, zero errors
- `npm run lint` — clean, zero errors/warnings
- `npm run build` — clean production build
- `npm test` — **29/29 tests passing**, covering:
  - Login success/failure paths, generic-error-on-bad-credentials (no user enumeration)
  - Token never leaks a password/hash in any response
  - RBAC: a Staff-role user is correctly forbidden from `chit_schemes:write` and from `branches:read` (no grant), and correctly allowed `customers:read`
  - Refresh rotation, and rejection of a reused (already-rotated) refresh token
  - Logout revokes the session; the same refresh token is rejected afterward
  - Full password-reset lifecycle: request → confirm → old sessions dead → new password works → old password rejected
  - Payments: partial payment → status `partial`; over-payment rejected (`409`) before any state changes; completing payment flips status to `paid`; reversal rolls back `paid_amount`/`status` and cannot be repeated
  - Auctions: bidding moves status to `live`; completing with a non-bidder is rejected; completing computes the correct prize/commission from the scheme's real numbers; exactly one bid ends up flagged winning; a completed auction rejects further bids or a second completion
- The full test suite was run **twice consecutively without resetting the database**, and passed both times — confirming the tests (and, by extension, the underlying transactional logic) don't depend on a pristine starting state.

Two real bugs were caught and fixed during this verification (not left for a future phase to discover):
1. **Express 5 changed `req.query`/`req.params` into non-writable getters.** The validation middleware's direct reassignment (`req.query = parsed`) threw at runtime despite type-checking cleanly. Fixed by replacing the getter via `Object.defineProperty` instead of plain assignment.
2. **Cross-connection read-your-own-write bug.** Several services (`payments`, `staff`, `chit-members`, `auctions`) called their pool-backed `getXById()` helper *inside* an open transaction to build the response — but that helper runs on a different pooled connection, which under PostgreSQL's default READ COMMITTED isolation cannot see the transaction's uncommitted writes. Fixed by returning only the affected ID from inside the transaction and doing the enriched lookup after commit.

---

**Stopping here per instructions.** Phase 4 (CRM frontend) resumes separately, now against a real, tested API instead of a mocked one.
