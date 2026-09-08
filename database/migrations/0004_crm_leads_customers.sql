-- =====================================================================
-- Migration 0004: CRM — leads, customers, customer_documents, followups
-- =====================================================================
BEGIN;

CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(150) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               CITEXT,
    source              VARCHAR(50),                 -- e.g. 'website', 'walk_in', 'referral', 'whatsapp'
    status              lead_status_enum NOT NULL DEFAULT 'new',
    interested_scheme_id UUID,                        -- FK added after chit_schemes exists (migration 0005)
    branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
    assigned_staff_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
    converted_customer_id UUID,                        -- FK added after customers exists in this same migration
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_leads_status ON leads (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_branch ON leads (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned_staff ON leads (assigned_staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_phone_trgm ON leads USING gin (phone gin_trgm_ops);
CREATE INDEX idx_leads_name_trgm ON leads USING gin (full_name gin_trgm_ops);

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL until the customer activates a mobile/portal login
    full_name           VARCHAR(150) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               CITEXT,
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    date_of_birth       DATE,
    branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
    assigned_staff_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
    source_lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
    kyc_status          document_status_enum NOT NULL DEFAULT 'pending',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_customers_user UNIQUE (user_id),
    CONSTRAINT uq_customers_phone UNIQUE (phone)
);

CREATE INDEX idx_customers_branch ON customers (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_assigned_staff ON customers (assigned_staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_active ON customers (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm ON customers USING gin (phone gin_trgm_ops);

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that customers exists, wire up the lead -> converted customer FK.
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_converted_customer
    FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX idx_leads_converted_customer ON leads (converted_customer_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- customer_documents (KYC etc.)
-- ---------------------------------------------------------------------
CREATE TABLE customer_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_type       VARCHAR(50) NOT NULL,        -- e.g. 'aadhaar', 'pan', 'address_proof', 'photo'
    file_url            TEXT NOT NULL,
    status              document_status_enum NOT NULL DEFAULT 'pending',
    verified_by         UUID REFERENCES staff(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_customer_documents_customer ON customer_documents (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_documents_status ON customer_documents (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_customer_documents_updated_at
    BEFORE UPDATE ON customer_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- followups: generic CRM task tied to either a lead or a customer.
-- Modeled as a polymorphic (related_type, related_id) pair rather than
-- two nullable FKs, since a followup is always about exactly one of them.
-- ---------------------------------------------------------------------
CREATE TABLE followups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_type        followup_related_enum NOT NULL,
    related_id          UUID NOT NULL,                -- points to leads.id or customers.id depending on related_type
    assigned_staff_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
    due_date            TIMESTAMPTZ NOT NULL,
    status              followup_status_enum NOT NULL DEFAULT 'pending',
    notes               TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_followups_related ON followups (related_type, related_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_followups_assigned_staff ON followups (assigned_staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_followups_status_due ON followups (status, due_date) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_followups_updated_at
    BEFORE UPDATE ON followups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE followups IS 'related_id is intentionally not a foreign key (polymorphic association across leads/customers). Referential integrity for this column is enforced at the application layer, not the database layer.';

COMMIT;
