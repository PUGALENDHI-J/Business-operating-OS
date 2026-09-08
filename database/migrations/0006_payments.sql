-- =====================================================================
-- Migration 0006: installments, payments, payment_receipts
-- =====================================================================
-- Design note: installments are the *expected* dues (one row per member
-- per cycle, generated when a chit_group starts). payments are the
-- *actual* money received, which can be partial or span multiple
-- transactions against one installment — hence a one-to-many, not a
-- one-to-one, between installments and payments. All money columns use
-- NUMERIC, never FLOAT/DOUBLE, to avoid floating-point rounding on
-- currency.
-- =====================================================================
BEGIN;

CREATE TABLE installments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_member_id      UUID NOT NULL REFERENCES chit_members(id) ON DELETE RESTRICT,
    cycle_number        INTEGER NOT NULL CHECK (cycle_number > 0),
    due_date            DATE NOT NULL,
    due_amount          NUMERIC(14,2) NOT NULL CHECK (due_amount > 0),
    paid_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status              installment_status_enum NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One installment row per member per cycle — never duplicated.
    CONSTRAINT uq_installments_member_cycle UNIQUE (chit_member_id, cycle_number),
    CONSTRAINT chk_installments_paid_not_exceed CHECK (paid_amount <= due_amount)
);

CREATE INDEX idx_installments_member ON installments (chit_member_id);
CREATE INDEX idx_installments_status_due ON installments (status, due_date);
CREATE INDEX idx_installments_due_date ON installments (due_date);

CREATE TRIGGER trg_installments_updated_at
    BEFORE UPDATE ON installments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE installments IS 'No soft-delete: an installment is a financial record of an obligation and must never disappear from history. Corrections are made via status changes (e.g. "waived"), not deletion.';

-- ---------------------------------------------------------------------
-- payments: actual transactions against an installment.
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id      UUID NOT NULL REFERENCES installments(id) ON DELETE RESTRICT,
    chit_member_id      UUID NOT NULL REFERENCES chit_members(id) ON DELETE RESTRICT, -- denormalized for fast lookups without a join
    amount              NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method      payment_method_enum NOT NULL,
    reference_number    VARCHAR(100),                  -- UPI ref / cheque number / transaction ID
    payment_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status              payment_status_enum NOT NULL DEFAULT 'success',
    collected_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_payments_reference UNIQUE (reference_number)
        DEFERRABLE INITIALLY DEFERRED  -- cash payments may share no reference; NULLs are exempt from uniqueness in Postgres, but this guards duplicate digital-reference entry
);

CREATE INDEX idx_payments_installment ON payments (installment_id);
CREATE INDEX idx_payments_chit_member ON payments (chit_member_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_payment_date ON payments (payment_date);
CREATE INDEX idx_payments_collected_by ON payments (collected_by);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE payments IS 'No soft-delete and no UPDATE-in-place of amount: a wrong payment is corrected by inserting a reversal/refund row with status=refunded/reversed and a note, preserving a full audit trail.';

-- ---------------------------------------------------------------------
-- payment_receipts: one receipt document per payment.
-- ---------------------------------------------------------------------
CREATE TABLE payment_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    receipt_number      VARCHAR(30) NOT NULL,
    pdf_url             TEXT,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_by           UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_payment_receipts_payment UNIQUE (payment_id),
    CONSTRAINT uq_payment_receipts_number UNIQUE (receipt_number)
);

CREATE INDEX idx_payment_receipts_issued_at ON payment_receipts (issued_at);

COMMIT;
