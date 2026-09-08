-- =====================================================================
-- Migration 0009: activity_logs, audit_logs, settings
-- =====================================================================
-- Design note: activity_logs and audit_logs are deliberately separate,
-- serving different consumers:
--   - activity_logs: lightweight, human-readable "who did what" feed
--     for the CRM's own activity/timeline views (e.g. "Staff X called
--     Customer Y").
--   - audit_logs: compliance-grade, field-level before/after record of
--     every change to financially or legally sensitive tables, intended
--     for regulatory/audit review rather than product UI.
-- =====================================================================
BEGIN;

CREATE TABLE activity_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action              VARCHAR(100) NOT NULL,         -- e.g. 'lead.status_changed', 'customer.created'
    entity_type         VARCHAR(50),                   -- e.g. 'lead', 'customer', 'payment' — no FK (polymorphic, spans every table)
    entity_id           UUID,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_actor ON activity_logs (actor_user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at);

-- ---------------------------------------------------------------------
-- audit_logs: field-level change history.
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name          VARCHAR(100) NOT NULL,
    record_id           UUID NOT NULL,
    action              audit_action_enum NOT NULL,
    old_values          JSONB,
    new_values          JSONB,
    changed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address          INET,
    user_agent          TEXT
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs (changed_by);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs (changed_at);
-- GIN indexes allow querying inside the JSONB diff (e.g. "find every
-- audit row where old_values.status = 'pending'").
CREATE INDEX idx_audit_logs_old_values ON audit_logs USING gin (old_values);
CREATE INDEX idx_audit_logs_new_values ON audit_logs USING gin (new_values);

COMMENT ON TABLE audit_logs IS 'Populated by the application layer on every write to a financially/legally sensitive table (customers, chit_members, installments, payments, auctions, auction_bids). Never updated or deleted once written — append-only by design (enforced procedurally, not with a DB-level rule, to keep the write path in the API layer).';

-- ---------------------------------------------------------------------
-- settings: key-value application configuration.
-- ---------------------------------------------------------------------
CREATE TABLE settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key         VARCHAR(100) NOT NULL,
    setting_value       JSONB NOT NULL,
    description         TEXT,
    updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_settings_key UNIQUE (setting_key)
);

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE settings IS 'Application configuration only (e.g. default commission %, notification lead times). Never used for secrets/API keys — those remain in environment variables per project security rules, never in the database.';

COMMIT;
