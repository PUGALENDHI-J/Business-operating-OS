-- =====================================================================
-- Migration 0011: full permission matrix for Phase 3's API modules
-- =====================================================================
-- The Phase 2 dev seed only populated 7 permissions across 3 modules as
-- an illustrative example. Phase 3 implements real authorization
-- middleware against this table for every module in the API, so the
-- permission set now needs to actually cover all of them.
--
-- Role design (matches the six roles named in the project brief):
--   Super Admin  — everything, including user/role administration.
--   Admin        — everything except role/permission administration
--                  (a compromised Admin account shouldn't be able to
--                  grant itself Super Admin powers).
--   Manager      — read/write on the CRM/operational modules (leads,
--                  customers, chit groups/members, followups, staff
--                  read), no delete, no user/branch administration.
--   Staff        — day-to-day: read/write leads, customers, payments,
--                  installments, chit-members; no delete, no admin.
--   Accountant   — read/write payments, installments, receipts; read
--                  on customers/chit-groups/auctions; no lead/CRM write.
--   Read Only    — read on every module, write/delete on none.
-- =====================================================================
BEGIN;

INSERT INTO permissions (module, action, description) VALUES
    ('users',        'read',   'View user accounts'),
    ('users',        'write',  'Create/edit user accounts'),
    ('users',        'delete', 'Deactivate/delete user accounts'),
    ('roles',        'read',   'View roles and permissions'),
    ('roles',        'write',  'Manage role/permission assignments'),
    ('staff',        'read',   'View staff records'),
    ('staff',        'delete', 'Deactivate/delete staff records'),
    ('branches',     'read',   'View branches'),
    ('branches',     'write',  'Create/edit branches'),
    ('branches',     'delete', 'Delete branches'),
    ('leads',        'read',   'View leads'),
    ('leads',        'write',  'Create/edit leads, change lead status'),
    ('leads',        'delete', 'Delete leads'),
    ('customers',    'delete', 'Delete customer records'),
    ('chit_schemes', 'read',   'View chit scheme catalogue'),
    ('chit_schemes', 'write',  'Create/edit chit schemes'),
    ('chit_schemes', 'delete', 'Delete chit schemes'),
    ('chit_groups',  'read',   'View chit groups'),
    ('chit_groups',  'write',  'Create/edit chit groups'),
    ('chit_groups',  'delete', 'Delete chit groups'),
    ('chit_members', 'read',   'View chit group memberships'),
    ('chit_members', 'write',  'Add/edit chit group memberships'),
    ('chit_members', 'delete', 'Remove chit group memberships'),
    ('installments', 'read',   'View installment schedules'),
    ('installments', 'write',  'Edit installment status (e.g. waive)'),
    ('payments',     'delete', 'Reverse/delete payment records'),
    ('auctions',     'delete', 'Delete auction records'),
    ('notifications','read',   'View notifications'),
    ('notifications','write',  'Create/send notifications'),
    ('whatsapp',     'read',   'View WhatsApp templates and message log'),
    ('whatsapp',     'write',  'Manage WhatsApp templates')
ON CONFLICT (module, action) DO NOTHING;

-- ---------------------------------------------------------------------
-- Super Admin: every permission that exists.
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM permissions p
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Admin: everything except roles:* (role/permission administration).
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', p.id
FROM permissions p
WHERE p.module <> 'roles'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Manager: operational read/write, no delete, no user/branch admin.
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', p.id
FROM permissions p
WHERE (p.module, p.action) IN (
    ('staff','read'), ('branches','read'),
    ('leads','read'), ('leads','write'),
    ('customers','read'), ('customers','write'),
    ('chit_schemes','read'),
    ('chit_groups','read'), ('chit_groups','write'),
    ('chit_members','read'), ('chit_members','write'),
    ('installments','read'),
    ('payments','read'),
    ('auctions','read'), ('auctions','write'),
    ('notifications','read'), ('notifications','write'),
    ('whatsapp','read')
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Staff: front-line CRM + collections work, no delete, no admin.
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', p.id
FROM permissions p
WHERE (p.module, p.action) IN (
    ('leads','read'), ('leads','write'),
    ('customers','read'), ('customers','write'),
    ('chit_schemes','read'),
    ('chit_groups','read'),
    ('chit_members','read'), ('chit_members','write'),
    ('installments','read'),
    ('payments','read'), ('payments','write'),
    ('auctions','read'),
    ('notifications','read'),
    ('whatsapp','read')
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Accountant: payments/installments/receipts-centric.
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', p.id
FROM permissions p
WHERE (p.module, p.action) IN (
    ('customers','read'),
    ('chit_schemes','read'),
    ('chit_groups','read'),
    ('chit_members','read'),
    ('installments','read'), ('installments','write'),
    ('payments','read'), ('payments','write'),
    ('auctions','read'),
    ('notifications','read')
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Read Only: every *:read permission, nothing else.
-- ---------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', p.id
FROM permissions p
WHERE p.action = 'read'
ON CONFLICT DO NOTHING;

COMMIT;
