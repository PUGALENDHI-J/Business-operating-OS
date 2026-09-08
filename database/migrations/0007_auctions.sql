-- =====================================================================
-- Migration 0007: auctions, auction_bids
-- =====================================================================
BEGIN;

CREATE TABLE auctions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_group_id       UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    cycle_number        INTEGER NOT NULL CHECK (cycle_number > 0),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status              auction_status_enum NOT NULL DEFAULT 'scheduled',
    winning_member_id   UUID REFERENCES chit_members(id) ON DELETE SET NULL,
    winning_bid_percent NUMERIC(5,2) CHECK (winning_bid_percent IS NULL OR (winning_bid_percent >= 0 AND winning_bid_percent <= 100)),
    prize_amount        NUMERIC(14,2) CHECK (prize_amount IS NULL OR prize_amount > 0), -- amount paid out to the winner after commission/dividend deduction
    commission_amount   NUMERIC(14,2) CHECK (commission_amount IS NULL OR commission_amount >= 0),
    conducted_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One auction per group per cycle.
    CONSTRAINT uq_auctions_group_cycle UNIQUE (chit_group_id, cycle_number)
);

CREATE INDEX idx_auctions_group ON auctions (chit_group_id);
CREATE INDEX idx_auctions_status_scheduled ON auctions (status, scheduled_at);
CREATE INDEX idx_auctions_winning_member ON auctions (winning_member_id);

CREATE TRIGGER trg_auctions_updated_at
    BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE auctions IS 'No soft-delete: an auction outcome is a financial/legal event for the group and must remain in history even if later marked cancelled via status.';

-- ---------------------------------------------------------------------
-- auction_bids: every bid placed by a member in a given auction.
-- ---------------------------------------------------------------------
CREATE TABLE auction_bids (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id          UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    chit_member_id      UUID NOT NULL REFERENCES chit_members(id) ON DELETE RESTRICT,
    bid_percent         NUMERIC(5,2) NOT NULL CHECK (bid_percent >= 0 AND bid_percent <= 100),
    bid_amount          NUMERIC(14,2) NOT NULL CHECK (bid_amount >= 0),
    bid_time            TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_winning_bid      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A member may only bid once per auction (revisions handled at the
    -- application layer as an update to this single row while the
    -- auction is still live, not as multiple rows).
    CONSTRAINT uq_auction_bids_auction_member UNIQUE (auction_id, chit_member_id)
);

CREATE INDEX idx_auction_bids_auction ON auction_bids (auction_id);
CREATE INDEX idx_auction_bids_member ON auction_bids (chit_member_id);

-- Only one winning bid per auction — enforced with a partial unique index
-- rather than a CHECK, since CHECK constraints cannot reference other rows.
CREATE UNIQUE INDEX uq_auction_bids_one_winner_per_auction
    ON auction_bids (auction_id) WHERE is_winning_bid = TRUE;

-- Cross-reference: the auction's winning_member_id should correspond to
-- the auction_bids row flagged is_winning_bid = TRUE for that auction.
-- This consistency is enforced at the application layer (setting both in
-- the same transaction); it is documented here rather than re-derived via
-- trigger to keep write-path logic in one place (the API layer).

COMMIT;
