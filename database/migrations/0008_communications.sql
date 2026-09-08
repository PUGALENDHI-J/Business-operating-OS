-- =====================================================================
-- Migration 0008: notifications, whatsapp_templates, whatsapp_messages
-- =====================================================================
BEGIN;

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                notification_type_enum NOT NULL,
    title               VARCHAR(200) NOT NULL,
    body                TEXT,
    related_entity_type VARCHAR(50),                  -- e.g. 'installment', 'auction', 'followup' — informational only, no FK (polymorphic)
    related_entity_id   UUID,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

COMMENT ON TABLE notifications IS 'In-app notification feed only. Outbound WhatsApp delivery is tracked separately in whatsapp_messages, since the two channels have different delivery/read semantics.';

-- ---------------------------------------------------------------------
-- whatsapp_templates: registry of Meta-approved message templates.
-- Per Phase 1 audit, no WhatsApp Business API access exists yet — this
-- table is structural groundwork, not populated with real template IDs
-- until Meta approval happens (Phase 8).
-- ---------------------------------------------------------------------
CREATE TABLE whatsapp_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name       VARCHAR(100) NOT NULL,        -- internal name, e.g. 'payment_reminder_v1'
    meta_template_name  VARCHAR(100),                  -- the name registered with Meta, once approved
    category            VARCHAR(50),                   -- e.g. 'UTILITY', 'MARKETING' (Meta's own categories)
    language_code       VARCHAR(10) NOT NULL DEFAULT 'en',
    body_text           TEXT NOT NULL,                 -- template body with {{1}}, {{2}} style placeholders
    status              whatsapp_template_status_enum NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_whatsapp_templates_name UNIQUE (template_name)
);

CREATE TRIGGER trg_whatsapp_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- whatsapp_messages: outbound message log (also serves as the delivery
-- audit trail required for a regulated financial business).
-- ---------------------------------------------------------------------
CREATE TABLE whatsapp_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone     VARCHAR(20) NOT NULL,
    recipient_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    template_id         UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    related_entity_type VARCHAR(50),                   -- e.g. 'installment', 'auction', 'lead' — no FK (polymorphic)
    related_entity_id   UUID,
    status              whatsapp_message_status_enum NOT NULL DEFAULT 'queued',
    provider_message_id VARCHAR(150),                  -- Meta's wamid
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages (status);
CREATE INDEX idx_whatsapp_messages_customer ON whatsapp_messages (recipient_customer_id);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages (created_at);
CREATE INDEX idx_whatsapp_messages_related ON whatsapp_messages (related_entity_type, related_entity_id);

COMMIT;
