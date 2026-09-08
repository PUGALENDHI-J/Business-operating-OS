-- =====================================================================
-- Migration 0001: Extensions, ENUM types, shared trigger function
-- =====================================================================
BEGIN;

-- gen_random_uuid() is native to PostgreSQL core since v13; pgcrypto kept
-- for future crypto needs (e.g. hashing helpers), pg_trgm for fuzzy/ILIKE
-- search on names/phones in the CRM.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- citext gives case-insensitive email comparison/uniqueness at the
-- database level (so 'A@X.com' and 'a@x.com' are treated as the same
-- address) without relying on every query remembering to lower() it.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------
CREATE TYPE user_type_enum AS ENUM ('staff', 'customer');

CREATE TYPE lead_status_enum AS ENUM
    ('new', 'contacted', 'interested', 'follow_up', 'converted', 'lost');

CREATE TYPE document_status_enum AS ENUM ('pending', 'verified', 'rejected');

CREATE TYPE chit_frequency_enum AS ENUM ('weekly', 'monthly');

CREATE TYPE chit_group_status_enum AS ENUM
    ('pending', 'active', 'completed', 'cancelled');

CREATE TYPE chit_member_status_enum AS ENUM
    ('active', 'defaulted', 'completed', 'exited');

CREATE TYPE installment_status_enum AS ENUM
    ('pending', 'paid', 'partial', 'overdue', 'waived');

CREATE TYPE payment_method_enum AS ENUM
    ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other');

CREATE TYPE payment_status_enum AS ENUM
    ('success', 'failed', 'refunded', 'reversed');

CREATE TYPE auction_status_enum AS ENUM
    ('scheduled', 'live', 'completed', 'cancelled');

CREATE TYPE followup_related_enum AS ENUM ('lead', 'customer');

CREATE TYPE followup_status_enum AS ENUM
    ('pending', 'completed', 'cancelled');

CREATE TYPE notification_type_enum AS ENUM
    ('system', 'payment_reminder', 'payment_overdue', 'auction_reminder',
     'auction_result', 'document_reminder', 'followup_reminder', 'general');

CREATE TYPE whatsapp_message_status_enum AS ENUM
    ('queued', 'sent', 'delivered', 'read', 'failed');

CREATE TYPE whatsapp_template_status_enum AS ENUM
    ('pending', 'approved', 'rejected', 'disabled');

CREATE TYPE audit_action_enum AS ENUM ('insert', 'update', 'delete');

-- ---------------------------------------------------------------------
-- Shared trigger function: keeps updated_at current on every UPDATE.
-- Applied per-table in each subsequent migration.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
