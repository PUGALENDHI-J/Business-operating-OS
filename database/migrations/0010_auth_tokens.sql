-- =====================================================================
-- Migration 0010: refresh_tokens, password_reset_tokens
-- Added in Phase 3 (Backend API & Authentication) — not part of the
-- original Phase 2 candidate table list, but required to implement two
-- things explicitly requested this phase: revocable login sessions
-- ("session/token handling") and a real, persisted password-reset flow
-- ("password reset architecture"). Both are minimal, justified additions
-- rather than scope creep — no other new tables are introduced here.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- refresh_tokens: one row per issued refresh token. The raw JWT is never
-- stored — only SHA-256(token) — so a leaked database backup cannot be
-- replayed as a valid session. Refresh tokens are rotated on every use
-- (replaced_by_token_id links the old row to its replacement), so reuse
-- of an already-rotated token is detectable and treated as a signal to
-- revoke the whole chain at the application layer.
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash            VARCHAR(64) NOT NULL,          -- hex SHA-256, always 64 chars
    issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ NOT NULL,
    revoked_at            TIMESTAMPTZ,
    replaced_by_token_id  UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    ip_address            INET,
    user_agent            TEXT,

    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
-- Partial index: only active (not-yet-revoked) sessions are looked up by
-- expiry on every refresh request, so there's no reason to index revoked
-- rows for that lookup path.
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens (user_id, expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE refresh_tokens IS 'token_hash stores SHA-256(refresh_jwt), never the raw token. Logout sets revoked_at rather than deleting the row, so a full session history survives for audit. replaced_by_token_id supports rotation-with-reuse-detection.';

-- ---------------------------------------------------------------------
-- password_reset_tokens: single-use, time-limited reset tokens.
-- ---------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash          VARCHAR(64) NOT NULL,            -- hex SHA-256 of the emailed/SMSed token
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    requested_ip        INET,

    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_active ON password_reset_tokens (user_id, expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE password_reset_tokens IS 'Only the SHA-256 hash of the reset token is stored — the raw token is emailed/SMSed to the user and never persisted. used_at is set on redemption, making each token single-use even before it naturally expires.';

COMMIT;
