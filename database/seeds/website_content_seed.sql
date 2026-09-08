-- =====================================================================
-- WEBSITE CONTENT SEED — safe for any environment (not dev-only)
-- =====================================================================
-- Unlike database/seeds/dev_seed.sql, this file contains no fictional
-- people and is safe to run against a real deployment: it only backfills
-- URL slugs (mechanical, derived from scheme_code) and adds short
-- "highlight" bullets / FAQ answers that restate facts already published
-- in the company's own presentation material (auction terms, the 15-day
-- interest-free facility, mobile app feature list, contact details).
-- Nothing here introduces a number, rate, or promise not already in that
-- material.
-- =====================================================================
BEGIN;

-- Slugs: mechanical derivation from the existing unique scheme_code.
UPDATE chit_schemes
   SET slug = lower(regexp_replace(scheme_code, '[^a-zA-Z0-9]+', '-', 'g'))
 WHERE slug IS NULL;

-- Highlights: short bullets restating what the presentation already says
-- about auction-based schemes in general (oral auction, no fixed chit
-- amount, bidding capped at 30%, 5% formal commission) — applied only to
-- the auction-based products the presentation explicitly labels that way.
UPDATE chit_schemes
   SET highlights = '["Auction based", "Oral auction — no fixed allotment", "Bidding capped at 30%", "5% formal commission"]'::jsonb
 WHERE scheme_code IN ('DIAMOND-A1-5L', 'PLATINUM-25L', 'HONEY-25K', 'SUPERJET-1L');

UPDATE chit_schemes
   SET highlights = '["Fixed monthly subscription", "Transparent, published payout schedule"]'::jsonb
 WHERE scheme_code IN ('SILVER-1', 'SILVER-2', 'GOLD-A1-1L', 'GOLD-A1-2L');

UPDATE chit_schemes SET is_featured = TRUE, display_order = 1 WHERE scheme_code = 'GOLD-A1-1L';
UPDATE chit_schemes SET is_featured = TRUE, display_order = 2 WHERE scheme_code = 'DIAMOND-A1-5L';
UPDATE chit_schemes SET display_order = 3 WHERE scheme_code = 'PLATINUM-25L';
UPDATE chit_schemes SET display_order = 4 WHERE scheme_code = 'SILVER-1';
UPDATE chit_schemes SET display_order = 5 WHERE scheme_code = 'SILVER-2';
UPDATE chit_schemes SET display_order = 6 WHERE scheme_code = 'GOLD-A1-2L';
UPDATE chit_schemes SET display_order = 7 WHERE scheme_code = 'HONEY-25K';
UPDATE chit_schemes SET display_order = 8 WHERE scheme_code = 'SUPERJET-1L';

-- FAQs: each answer restates a fact already stated in the presentation —
-- none of these introduce a number, guarantee, or policy not already
-- published. Kept short deliberately; a client-provided FAQ document
-- should eventually replace/extend this set via the same table.
INSERT INTO faqs (question, answer, display_order) VALUES
    ('What is a chit fund with NACHIYAR?',
     'A chit is a group savings and credit scheme: a fixed group of members contributes a set amount each cycle, and one member receives the pooled amount each cycle through either a fixed schedule or an auction, depending on the scheme. NACHIYAR CHIT & FINANCE PVT LTD has offered chit schemes since 2018 under the motto "Save Together, Grow Together, Prosper Together."',
     1),
    ('How does the auction process work?',
     'For auction-based schemes, NACHIYAR conducts a live oral auction — there is no fixed chit amount. Members may bid up to 30% of the chit value, and a 5% formal commission applies as per company policy. The process is designed to be transparent, with all members able to participate.',
     2),
    ('What is the 15-day interest-free facility?',
     'Members who have been contributing regularly to their chit scheme can access up to 45% of the amount they have paid in as an interest-free facility for 15 days, for emergency needs — with no interest charged during that 15-day window.',
     3),
    ('Is there a mobile app?',
     'NACHIYAR offers a mobile app (available on the Play Store) intended to let members view scheme details, follow live auctions, track payments, request loans, view account statements, and receive notifications.',
     4),
    ('Where is NACHIYAR located, and how can I reach you?',
     'NACHIYAR CHIT & FINANCE PVT LTD is located in Velpadi, Vellore, Tamil Nadu. You can reach us at 9043420099 or through the enquiry form on this website.',
     5)
ON CONFLICT DO NOTHING;

COMMIT;
