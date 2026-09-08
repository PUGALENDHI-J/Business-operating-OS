-- =====================================================================
-- Migration 0012: Website content fields (Phase 5)
-- =====================================================================
-- Per Phase 5 instructions: "If scheme information is unavailable from
-- the supplied material, create editable CMS/database fields rather
-- than inventing values." This migration adds exactly that — nullable,
-- staff-editable fields for the public website's scheme pages — plus a
-- small FAQ table for the /faq page. No values are pre-filled here that
-- weren't already published in the company's own presentation material;
-- anything not covered by that material is left NULL/empty rather than
-- invented, and the CRM (Phase 4, chit-schemes page) is where staff can
-- fill these in later without a further migration.
-- =====================================================================
BEGIN;

ALTER TABLE chit_schemes
    ADD COLUMN slug               VARCHAR(100) UNIQUE,
    ADD COLUMN short_description  TEXT,
    ADD COLUMN highlights         JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN hero_image_url     TEXT,
    ADD COLUMN display_order      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN show_on_website    BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN chit_schemes.slug IS 'URL slug for /chit-schemes/[slug] on the public website. Backfilled from scheme_code below; editable independently afterwards.';
COMMENT ON COLUMN chit_schemes.highlights IS 'Array of short bullet strings for the website scheme card (e.g. ["Auction based", "Flexible bidding"]) — CMS-editable, not auto-derived.';
COMMENT ON COLUMN chit_schemes.show_on_website IS 'Lets staff unpublish a scheme from the public site without deleting/deactivating it in the CRM.';

CREATE INDEX idx_chit_schemes_show_on_website ON chit_schemes (show_on_website, display_order) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- faqs: editable Q&A content for the /faq page.
-- ---------------------------------------------------------------------
CREATE TABLE faqs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question            TEXT NOT NULL,
    answer              TEXT NOT NULL,
    display_order       INTEGER NOT NULL DEFAULT 0,
    is_published        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faqs_published_order ON faqs (is_published, display_order);

CREATE TRIGGER trg_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
