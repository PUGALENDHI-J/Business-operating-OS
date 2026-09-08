-- =====================================================================
-- Migration 0005: Chit core — chit_schemes, chit_groups, chit_members
-- =====================================================================
-- Design note: chit_schemes are the reusable product templates seen in
-- the company presentation (Silver, Gold-A1, Gold-A2, Diamond-A1,
-- Diamond-A2, Platinum, Honey Weekly, SuperJet). chit_groups are actual
-- running instances of a scheme (a real batch of members subscribing
-- together). This separation lets the same "Gold Scheme A1 - ₹1,00,000"
-- product spawn many concurrent groups over time.
-- =====================================================================
BEGIN;

CREATE TABLE chit_schemes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,        -- e.g. 'Gold Scheme - A1 (₹1,00,000)'
    scheme_code         VARCHAR(30) NOT NULL,
    chit_amount         NUMERIC(14,2) NOT NULL CHECK (chit_amount > 0),
    member_count        INTEGER NOT NULL CHECK (member_count > 0),
    duration_periods    INTEGER NOT NULL CHECK (duration_periods > 0), -- number of weeks or months, per frequency
    frequency           chit_frequency_enum NOT NULL,
    installment_amount  NUMERIC(14,2) NOT NULL CHECK (installment_amount > 0),
    max_bid_percent     NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (max_bid_percent >= 0 AND max_bid_percent <= 100),
    commission_percent  NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_chit_schemes_code UNIQUE (scheme_code),
    -- chit_amount should equal installment_amount * member_count for a
    -- standard chit; enforced as a CHECK since it's a hard business rule
    -- for every scheme published in the company presentation.
    CONSTRAINT chk_chit_schemes_amount_consistency
        CHECK (chit_amount = installment_amount * member_count)
);

CREATE INDEX idx_chit_schemes_active ON chit_schemes (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_chit_schemes_updated_at
    BEFORE UPDATE ON chit_schemes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON CONSTRAINT chk_chit_schemes_amount_consistency ON chit_schemes IS 'Matches every scheme table published in the company presentation (e.g. ₹1,00,000 = ₹10,000 x 10 members).';

-- Now wire the deferred FK from migration 0004.
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_interested_scheme
    FOREIGN KEY (interested_scheme_id) REFERENCES chit_schemes(id) ON DELETE SET NULL;

CREATE INDEX idx_leads_interested_scheme ON leads (interested_scheme_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- chit_groups: a running instance/batch of a scheme.
-- ---------------------------------------------------------------------
CREATE TABLE chit_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id           UUID NOT NULL REFERENCES chit_schemes(id) ON DELETE RESTRICT,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    group_code          VARCHAR(30) NOT NULL,          -- e.g. 'GOLD-A1-2026-03'
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    status              chit_group_status_enum NOT NULL DEFAULT 'pending',
    current_cycle       INTEGER NOT NULL DEFAULT 0,     -- last completed installment/auction cycle number
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_chit_groups_code UNIQUE (group_code),
    CONSTRAINT chk_chit_groups_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_chit_groups_scheme ON chit_groups (scheme_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chit_groups_branch ON chit_groups (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chit_groups_status ON chit_groups (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_chit_groups_updated_at
    BEFORE UPDATE ON chit_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- chit_members: join of a customer into a specific chit_group.
-- ---------------------------------------------------------------------
CREATE TABLE chit_members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_group_id       UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    member_serial_no    INTEGER NOT NULL,               -- 1..member_count, ticket/serial number within the group
    join_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    status              chit_member_status_enum NOT NULL DEFAULT 'active',
    exit_date           DATE,
    exit_reason         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    -- A customer can only hold one seat per group, and each serial
    -- number within a group is unique.
    CONSTRAINT uq_chit_members_group_customer UNIQUE (chit_group_id, customer_id),
    CONSTRAINT uq_chit_members_group_serial UNIQUE (chit_group_id, member_serial_no)
);

CREATE INDEX idx_chit_members_group ON chit_members (chit_group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chit_members_customer ON chit_members (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chit_members_status ON chit_members (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_chit_members_updated_at
    BEFORE UPDATE ON chit_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
