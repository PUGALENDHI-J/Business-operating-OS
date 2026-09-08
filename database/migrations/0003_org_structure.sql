-- =====================================================================
-- Migration 0003: Organizational structure — branches, staff
-- =====================================================================
BEGIN;

CREATE TABLE branches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    code                VARCHAR(20) NOT NULL,        -- short branch code, e.g. 'VLR-01'
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    phone               VARCHAR(20),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_branches_code UNIQUE (code)
);

CREATE INDEX idx_branches_active ON branches (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE branches IS 'Only one branch (Velpadi, Vellore) is confirmed to exist today per Phase 1 audit; table is built multi-branch-ready per the brief''s explicit Branch Management requirement.';

-- ---------------------------------------------------------------------
-- staff: profile data for staff-type users. One-to-one with users.
-- ---------------------------------------------------------------------
CREATE TABLE staff (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    employee_code       VARCHAR(30),
    designation         VARCHAR(100),
    joining_date        DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_staff_user UNIQUE (user_id),
    CONSTRAINT uq_staff_employee_code UNIQUE (employee_code)
);

CREATE INDEX idx_staff_branch ON staff (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_active ON staff (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON CONSTRAINT uq_staff_user ON staff IS 'Enforces one staff profile per user account — a user is either a staff member or not, never two staff profiles.';

COMMIT;
