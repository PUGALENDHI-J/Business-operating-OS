-- =====================================================================
-- Migration 0002: Authentication & Role-Based Access Control
-- =====================================================================
-- Design note: `users` is the single identity/auth table shared by both
-- staff (CRM/admin logins) and customers (mobile app / portal logins).
-- One auth table means one password/OTP mechanism and one place every
-- other table's created_by/updated_by/actor reference points to,
-- regardless of whether the actor is staff or a customer.
-- =====================================================================
BEGIN;

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type           user_type_enum NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    email               CITEXT,
    phone               VARCHAR(20) NOT NULL,
    password_hash       TEXT,                       -- NULL allowed: OTP-only users may never set a password
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT uq_users_email UNIQUE (email)
);
CREATE INDEX idx_users_user_type ON users (user_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Single identity table for all logins (staff and customers). Role/permission scoping only applies to staff-type users.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt/argon2 hash only. Never store plaintext. NULL if the account only ever authenticates via OTP.';

-- ---------------------------------------------------------------------
-- roles: kept as a table (not a hardcoded enum) so an admin can add a
-- new role later without a schema migration. Seeded with the 6 roles
-- named in the project brief.
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(50) NOT NULL,
    description         TEXT,
    is_system_role      BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = one of the 6 seeded roles; protects against accidental deletion
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_roles_name UNIQUE (name)
);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- permissions: fine-grained module:action pairs (e.g. 'customers:write').
-- Deliberately simple (no separate "modules" table) since the action
-- list is small and changes rarely.
-- ---------------------------------------------------------------------
CREATE TABLE permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module              VARCHAR(50) NOT NULL,       -- e.g. 'customers', 'payments', 'auctions'
    action              VARCHAR(50) NOT NULL,       -- e.g. 'read', 'write', 'delete', 'approve'
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

CREATE TABLE role_permissions (
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id       UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);

CREATE TABLE user_roles (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by         UUID REFERENCES users(id) ON DELETE SET NULL,

    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);

COMMENT ON TABLE user_roles IS 'Many-to-many by design (a Manager could also be flagged Accountant), even though most staff will carry exactly one role in practice.';

COMMIT;
