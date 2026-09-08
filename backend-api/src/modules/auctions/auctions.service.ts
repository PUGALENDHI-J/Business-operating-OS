import { PoolClient } from 'pg';
import { query, withTransaction } from '@/db/pool';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '@/utils/pagination';

const SELECT = `
  a.id, a.cycle_number, a.scheduled_at, a.status, a.winning_bid_percent, a.prize_amount, a.commission_amount, a.notes,
  a.chit_group_id, cg.group_code, cs.name AS scheme_name, cs.chit_amount, cs.commission_percent AS scheme_commission_percent,
  a.winning_member_id, wc.full_name AS winning_customer_name,
  a.conducted_by, su.full_name AS conducted_by_name,
  a.created_at, a.updated_at`;
const FROM = `
  FROM auctions a
  JOIN chit_groups cg ON cg.id = a.chit_group_id
  JOIN chit_schemes cs ON cs.id = cg.scheme_id
  LEFT JOIN chit_members wm ON wm.id = a.winning_member_id
  LEFT JOIN customers wc ON wc.id = wm.customer_id
  LEFT JOIN staff st ON st.id = a.conducted_by
  LEFT JOIN users su ON su.id = st.user_id`;
const SORTABLE = ['scheduled_at', 'status', 'created_at'];

export async function listAuctions(q: PaginationQuery & { status?: string; chitGroupId?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.status) { params.push(q.status); where.push(`a.status = $${params.length}`); }
  if (q.chitGroupId) { params.push(q.chitGroupId); where.push(`a.chit_group_id = $${params.length}`); }
  if (q.search) { params.push(`%${q.search}%`); where.push(`cg.group_code ILIKE $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = 'a.' + safeSortColumn(q.sortBy, SORTABLE, 'scheduled_at');

  const countResult = await query<{ count: string }>(`SELECT count(*) ${FROM} ${whereSql}`, params);
  const dataParams = [...params, q.pageSize, (q.page - 1) * q.pageSize];
  const dataResult = await query(
    `SELECT ${SELECT} ${FROM} ${whereSql} ORDER BY ${sortColumn} ${q.sortDir.toUpperCase()} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );
  return { data: dataResult.rows, meta: buildPaginationMeta(q.page, q.pageSize, parseInt(countResult.rows[0].count, 10)) };
}

export async function getAuctionById(id: string) {
  const result = await query(`SELECT ${SELECT} ${FROM} WHERE a.id = $1`, [id]);
  if (!result.rows[0]) throw new NotFoundError('Auction');
  return result.rows[0];
}

export async function getAuctionBids(auctionId: string) {
  const result = await query(
    `SELECT ab.id, ab.bid_percent, ab.bid_amount, ab.bid_time, ab.is_winning_bid,
            ab.chit_member_id, c.full_name AS customer_name
       FROM auction_bids ab
       JOIN chit_members cm ON cm.id = ab.chit_member_id
       JOIN customers c ON c.id = cm.customer_id
      WHERE ab.auction_id = $1
      ORDER BY ab.bid_percent DESC`,
    [auctionId],
  );
  return result.rows;
}

export async function createAuction(input: { chit_group_id: string; cycle_number: number; scheduled_at: string }) {
  const groupResult = await query(`SELECT id FROM chit_groups WHERE id = $1 AND deleted_at IS NULL`, [input.chit_group_id]);
  if (!groupResult.rows[0]) throw new NotFoundError('Chit group');
  const result = await query<{ id: string }>(
    `INSERT INTO auctions (chit_group_id, cycle_number, scheduled_at) VALUES ($1, $2, $3) RETURNING id`,
    [input.chit_group_id, input.cycle_number, input.scheduled_at],
  );
  return getAuctionById(result.rows[0].id);
}

export async function updateAuction(id: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  if (columns.length === 0) return getAuctionById(id);
  const values = Object.values(input);
  const setSql = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const result = await query(`UPDATE auctions SET ${setSql} WHERE id = $${columns.length + 1} RETURNING id`, [...values, id]);
  if (!result.rows[0]) throw new NotFoundError('Auction');
  return getAuctionById(id);
}

/** Places (or updates, while the auction is still open) one member's bid. */
export async function placeBid(auctionId: string, chitMemberId: string, bidPercent: number) {
  return withTransaction(async (client: PoolClient) => {
    const auctionResult = await client.query<{ status: string; chit_amount: string }>(
      `SELECT a.status, cs.chit_amount FROM auctions a
         JOIN chit_groups cg ON cg.id = a.chit_group_id
         JOIN chit_schemes cs ON cs.id = cg.scheme_id
        WHERE a.id = $1 FOR UPDATE`,
      [auctionId],
    );
    const auction = auctionResult.rows[0];
    if (!auction) throw new NotFoundError('Auction');
    if (auction.status === 'completed' || auction.status === 'cancelled') {
      throw new ConflictError(`Cannot bid on an auction with status '${auction.status}'`);
    }

    const memberResult = await client.query(`SELECT id FROM chit_members WHERE id = $1 AND deleted_at IS NULL`, [chitMemberId]);
    if (!memberResult.rows[0]) throw new NotFoundError('Chit member');

    const chitAmount = parseFloat(auction.chit_amount);
    const bidAmount = (chitAmount * bidPercent) / 100;

    const result = await client.query(
      `INSERT INTO auction_bids (auction_id, chit_member_id, bid_percent, bid_amount)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auction_id, chit_member_id)
       DO UPDATE SET bid_percent = EXCLUDED.bid_percent, bid_amount = EXCLUDED.bid_amount, bid_time = now()
       RETURNING id`,
      [auctionId, chitMemberId, bidPercent, bidAmount],
    );

    // Auction moves to 'live' on its first bid.
    await client.query(`UPDATE auctions SET status = 'live' WHERE id = $1 AND status = 'scheduled'`, [auctionId]);

    return result.rows[0].id;
  });
}

/**
 * Completes an auction: marks the chosen member's bid as winning,
 * computes commission and payout from the scheme's chit_amount and
 * commission_percent, and advances the chit group's current_cycle — all
 * atomically. The winning bid must already exist (placed via placeBid);
 * this endpoint does not accept an arbitrary bid amount from the caller,
 * so the payout can never diverge from what was actually bid.
 */
export async function completeAuction(auctionId: string, winningChitMemberId: string, conductedByStaffId: string | null) {
  await withTransaction(async (client: PoolClient) => {
    const auctionResult = await client.query<{ id: string; status: string; cycle_number: number; chit_group_id: string }>(
      `SELECT id, status, cycle_number, chit_group_id FROM auctions WHERE id = $1 FOR UPDATE`,
      [auctionId],
    );
    const auction = auctionResult.rows[0];
    if (!auction) throw new NotFoundError('Auction');
    if (auction.status === 'completed') throw new ConflictError('Auction has already been completed');
    if (auction.status === 'cancelled') throw new ConflictError('Cannot complete a cancelled auction');

    const bidResult = await client.query<{ id: string; bid_percent: string }>(
      `SELECT id, bid_percent FROM auction_bids WHERE auction_id = $1 AND chit_member_id = $2`,
      [auctionId, winningChitMemberId],
    );
    const bid = bidResult.rows[0];
    if (!bid) throw new ConflictError('This member has not placed a bid in this auction');

    const schemeResult = await client.query<{ chit_amount: string; commission_percent: string }>(
      `SELECT cs.chit_amount, cs.commission_percent
         FROM chit_groups cg JOIN chit_schemes cs ON cs.id = cg.scheme_id
        WHERE cg.id = $1`,
      [auction.chit_group_id],
    );
    const scheme = schemeResult.rows[0];
    const chitAmount = parseFloat(scheme.chit_amount);
    const bidPercent = parseFloat(bid.bid_percent);
    const commissionAmount = (chitAmount * parseFloat(scheme.commission_percent)) / 100;
    const bidDiscount = (chitAmount * bidPercent) / 100;
    const prizeAmount = chitAmount - bidDiscount - commissionAmount;

    // Clear any stale winning flag, then set the real winner (the partial
    // unique index uq_auction_bids_one_winner_per_auction enforces there
    // can only ever be one).
    await client.query(`UPDATE auction_bids SET is_winning_bid = false WHERE auction_id = $1`, [auctionId]);
    await client.query(`UPDATE auction_bids SET is_winning_bid = true WHERE id = $1`, [bid.id]);

    await client.query(
      `UPDATE auctions
          SET status = 'completed', winning_member_id = $1, winning_bid_percent = $2,
              prize_amount = $3, commission_amount = $4, conducted_by = $5
        WHERE id = $6`,
      [winningChitMemberId, bidPercent, prizeAmount, commissionAmount, conductedByStaffId, auctionId],
    );

    await client.query(
      `UPDATE chit_groups SET current_cycle = GREATEST(current_cycle, $1) WHERE id = $2`,
      [auction.cycle_number, auction.chit_group_id],
    );
  });

  return getAuctionById(auctionId);
}
