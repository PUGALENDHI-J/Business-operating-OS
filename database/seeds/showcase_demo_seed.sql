-- Idempotent fictional showcase data for local and hosted demo environments.
-- Run after dev_seed.sql and website_content_seed.sql.
BEGIN;

INSERT INTO leads (id, full_name, phone, email, source, status, interested_scheme_id, branch_id, assigned_staff_id, notes)
VALUES
  ('e0000000-0000-0000-0000-000000000002', 'Test Lead Two', '9222222202', 'test.lead2@example.com', 'website', 'interested',
   '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
   'Demo lead for the hosted showcase environment.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (id, full_name, phone, email, source, status, interested_scheme_id, branch_id, assigned_staff_id, notes)
VALUES
  ('e0000000-0000-0000-0000-000000000003', 'Test Lead Three', '9222222203', 'test.lead3@example.com', 'referral', 'follow_up',
   '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   'Demo follow-up lead for CRM list and pipeline views.')
ON CONFLICT (id) DO NOTHING;

COMMIT;
