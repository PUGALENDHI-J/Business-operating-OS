-- =====================================================================
-- DEVELOPMENT SEED DATA — DO NOT RUN AGAINST PRODUCTION
-- =====================================================================
-- Every person, phone number, and email below is synthetic and clearly
-- fictional (obviously-fake names, +91-90000-0000x style numbers,
-- @example.com addresses). Nothing here is derived from any real
-- customer of NACHIYAR CHIT & FINANCE. The 8 chit schemes ARE the real
-- product names/amounts published in the company's own presentation
-- (Silver, Gold-A1/A2, Diamond-A1/A2, Platinum, Honey Weekly, SuperJet)
-- since those are public marketing facts, not private data.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- Roles (the 6 named in the project brief) + a minimal permission set
-- ---------------------------------------------------------------------
INSERT INTO roles (id, name, description, is_system_role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'Admin',       'Branch-wide administrative access', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'Manager',     'Manages staff and approvals', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'Staff',       'Day-to-day collections and customer handling', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'Accountant',  'Payments, receipts, and ledger access', TRUE),
    ('00000000-0000-0000-0000-000000000006', 'Read Only',   'View-only access for audits/reporting', TRUE);

INSERT INTO permissions (module, action, description) VALUES
    ('customers', 'read',  'View customer records'),
    ('customers', 'write', 'Create/edit customer records'),
    ('payments',  'read',  'View payment records'),
    ('payments',  'write', 'Record payments'),
    ('auctions',  'read',  'View auctions'),
    ('auctions',  'write', 'Conduct/manage auctions'),
    ('staff',     'write', 'Manage staff accounts');

-- Super Admin gets everything; Read Only gets every *:read permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions WHERE action = 'read';

-- ---------------------------------------------------------------------
-- Branch (only the one confirmed real branch from Phase 1 audit)
-- ---------------------------------------------------------------------
INSERT INTO branches (id, name, code, address_line1, city, state, pincode, phone, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Velpadi Main Branch', 'VLR-01',
     'Velpadi', 'Vellore', 'Tamil Nadu', '632001', '9043420099', TRUE);

-- ---------------------------------------------------------------------
-- Users + staff (fictional dev accounts only)
-- ---------------------------------------------------------------------
INSERT INTO users (id, user_type, full_name, email, phone, password_hash, is_active) VALUES
    ('20000000-0000-0000-0000-000000000001', 'staff', 'Dev Admin One',   'dev.admin@example.com',   '9000000001', crypt('devpassword123', gen_salt('bf')), TRUE),
    ('20000000-0000-0000-0000-000000000002', 'staff', 'Dev Manager One', 'dev.manager@example.com', '9000000002', crypt('devpassword123', gen_salt('bf')), TRUE),
    ('20000000-0000-0000-0000-000000000003', 'staff', 'Dev Staff One',   'dev.staff@example.com',   '9000000003', crypt('devpassword123', gen_salt('bf')), TRUE);

INSERT INTO user_roles (user_id, role_id) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004');

INSERT INTO staff (id, user_id, branch_id, employee_code, designation, joining_date) VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'EMP-001', 'Branch Admin', '2024-01-15'),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'EMP-002', 'Branch Manager', '2024-02-01'),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'EMP-003', 'Collections Staff', '2024-06-01');

-- ---------------------------------------------------------------------
-- Chit schemes — the real, published product catalogue
-- (chit_amount = installment_amount * member_count, per the CHECK
-- constraint and per the company presentation's own tables)
-- ---------------------------------------------------------------------
INSERT INTO chit_schemes (id, name, scheme_code, chit_amount, member_count, duration_periods, frequency, installment_amount, max_bid_percent, commission_percent) VALUES
    ('40000000-0000-0000-0000-000000000001', 'Silver Scheme - 1',      'SILVER-1',    25000.00,  10, 10, 'monthly', 2500.00,  30, 5),
    ('40000000-0000-0000-0000-000000000002', 'Silver Scheme - 2',      'SILVER-2',    50000.00,  10, 10, 'monthly', 5000.00,  30, 5),
    ('40000000-0000-0000-0000-000000000003', 'Gold Scheme - A1 (1L)',  'GOLD-A1-1L',  100000.00, 10, 10, 'monthly', 10000.00, 30, 5),
    ('40000000-0000-0000-0000-000000000004', 'Gold Scheme - A1 (2L)',  'GOLD-A1-2L',  200000.00, 10, 10, 'monthly', 20000.00, 30, 5),
    ('40000000-0000-0000-0000-000000000005', 'Diamond Scheme - A1 (5L)', 'DIAMOND-A1-5L', 500000.00, 25, 25, 'monthly', 20000.00, 30, 5),
    ('40000000-0000-0000-0000-000000000006', 'Platinum Scheme (25L)',  'PLATINUM-25L', 2500000.00, 50, 50, 'monthly', 50000.00, 30, 5),
    ('40000000-0000-0000-0000-000000000007', 'Honey Weekly Chit Scheme (25K)', 'HONEY-25K', 25000.00, 25, 25, 'weekly', 1000.00, 30, 5),
    ('40000000-0000-0000-0000-000000000008', 'SuperJet Chit Scheme (1L/100 days)', 'SUPERJET-1L', 100000.00, 100, 100, 'weekly', 1000.00, 30, 5);

-- ---------------------------------------------------------------------
-- One running chit group against the Gold Scheme A1 (1L)
-- ---------------------------------------------------------------------
INSERT INTO chit_groups (id, scheme_id, branch_id, group_code, start_date, end_date, status, current_cycle) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003',
     '10000000-0000-0000-0000-000000000001', 'GOLD-A1-1L-2026-01', '2026-01-01', '2026-10-31', 'active', 2);

-- ---------------------------------------------------------------------
-- Fictional dev customers + memberships
-- ---------------------------------------------------------------------
INSERT INTO users (id, user_type, full_name, email, phone, is_active) VALUES
    ('60000000-0000-0000-0000-000000000001', 'customer', 'Test Customer One', 'test.customer1@example.com', '9111111101', TRUE),
    ('60000000-0000-0000-0000-000000000002', 'customer', 'Test Customer Two', 'test.customer2@example.com', '9111111102', TRUE);

INSERT INTO customers (id, user_id, full_name, phone, email, city, state, pincode, branch_id, assigned_staff_id, kyc_status) VALUES
    ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Test Customer One', '9111111101', 'test.customer1@example.com', 'Vellore', 'Tamil Nadu', '632001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'verified'),
    ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Test Customer Two', '9111111102', 'test.customer2@example.com', 'Vellore', 'Tamil Nadu', '632001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'pending');

INSERT INTO chit_members (id, chit_group_id, customer_id, member_serial_no, join_date, status) VALUES
    ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 1, '2026-01-01', 'active'),
    ('80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 2, '2026-01-01', 'active');

-- ---------------------------------------------------------------------
-- Installments for cycle 1 (both paid) and cycle 2 (one paid, one pending)
-- ---------------------------------------------------------------------
INSERT INTO installments (id, chit_member_id, cycle_number, due_date, due_amount, paid_amount, status) VALUES
    ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1, '2026-01-05', 10000.00, 10000.00, 'paid'),
    ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 1, '2026-01-05', 10000.00, 10000.00, 'paid'),
    ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', 2, '2026-02-05', 10000.00, 10000.00, 'paid'),
    ('90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', 2, '2026-02-05', 10000.00, 0.00,     'pending');

INSERT INTO payments (id, installment_id, chit_member_id, amount, payment_method, reference_number, payment_date, status, collected_by) VALUES
    ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 10000.00, 'cash', NULL, '2026-01-05 10:00:00+05:30', 'success', '30000000-0000-0000-0000-000000000003'),
    ('a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 10000.00, 'upi',  'UPI-DEV-TEST-0001', '2026-01-05 11:00:00+05:30', 'success', '30000000-0000-0000-0000-000000000003'),
    ('a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', 10000.00, 'cash', NULL, '2026-02-05 10:00:00+05:30', 'success', '30000000-0000-0000-0000-000000000003');

INSERT INTO payment_receipts (id, payment_id, receipt_number, issued_by) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'RCPT-DEV-000001', '30000000-0000-0000-0000-000000000003'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'RCPT-DEV-000002', '30000000-0000-0000-0000-000000000003'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'RCPT-DEV-000003', '30000000-0000-0000-0000-000000000003');

-- ---------------------------------------------------------------------
-- One completed auction for cycle 1
-- ---------------------------------------------------------------------
INSERT INTO auctions (id, chit_group_id, cycle_number, scheduled_at, status, winning_member_id, winning_bid_percent, prize_amount, commission_amount, conducted_by) VALUES
    ('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, '2026-01-10 18:00:00+05:30', 'completed',
     '80000000-0000-0000-0000-000000000001', 20.00, 84000.00, 5000.00, '30000000-0000-0000-0000-000000000002');

INSERT INTO auction_bids (id, auction_id, chit_member_id, bid_percent, bid_amount, is_winning_bid) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 20.00, 20000.00, TRUE),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 15.00, 15000.00, FALSE);

-- ---------------------------------------------------------------------
-- One sample lead, one followup, one WhatsApp template (unapproved —
-- accurate to Phase 1 audit finding that no Meta approval exists yet)
-- ---------------------------------------------------------------------
INSERT INTO leads (id, full_name, phone, email, source, status, interested_scheme_id, branch_id, assigned_staff_id) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Test Lead One', '9222222201', 'test.lead1@example.com', 'website', 'new',
     '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003');

INSERT INTO followups (id, related_type, related_id, assigned_staff_id, due_date, status, notes) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'lead', 'e0000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000003', now() + interval '2 days', 'pending', 'Dev seed: call to explain Gold Scheme A1 terms.');

INSERT INTO whatsapp_templates (id, template_name, category, language_code, body_text, status) VALUES
    ('11100000-0000-0000-0000-000000000001', 'payment_reminder_v1', 'UTILITY', 'en',
     'Hi {{1}}, your chit installment of ₹{{2}} is due on {{3}}. Please pay to avoid late charges.', 'pending');

-- ---------------------------------------------------------------------
-- Default settings
-- ---------------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, description) VALUES
    ('default_commission_percent', '5'::jsonb, 'Default auction commission percentage applied to new schemes'),
    ('payment_reminder_days_before_due', '3'::jsonb, 'How many days before an installment due date to send a WhatsApp reminder');

COMMIT;
