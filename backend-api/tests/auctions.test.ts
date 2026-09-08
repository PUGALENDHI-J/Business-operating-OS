import request from 'supertest';
import { createApp } from '@/app';
import { pool, query } from '@/db/pool';

const app = createApp();
const SUPER_ADMIN_PHONE = '9000000001';
const PASSWORD = 'devpassword123';

let token: string;
let auctionId: string;

beforeAll(async () => {
  const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
  token = login.body.data.accessToken;

  const res = await request(app)
    .post('/api/v1/auctions')
    .set('Authorization', `Bearer ${token}`)
    .send({ chit_group_id: '50000000-0000-0000-0000-000000000001', cycle_number: 900 + Math.floor(Math.random() * 100000), scheduled_at: new Date().toISOString() });
  auctionId = res.body.data.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Auction bidding and completion', () => {
  it('accepts a bid from a chit member and moves the auction to live', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ chit_member_id: '80000000-0000-0000-0000-000000000001', bid_percent: 25 });
    expect(res.status).toBe(201);

    const auction = await request(app).get(`/api/v1/auctions/${auctionId}`).set('Authorization', `Bearer ${token}`);
    expect(auction.body.data.status).toBe('live');
  });

  it('accepts a second, higher bid from a different member', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ chit_member_id: '80000000-0000-0000-0000-000000000002', bid_percent: 30 });
    expect(res.status).toBe(201);
  });

  it('rejects completing the auction for a member who never bid', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ winning_chit_member_id: '00000000-0000-0000-0000-000000000099' });
    expect(res.status).toBe(409);
  });

  it('completes the auction, computing prize and commission from the scheme, and enforces a single winning bid', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ winning_chit_member_id: '80000000-0000-0000-0000-000000000002' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(parseFloat(res.body.data.winning_bid_percent)).toBeCloseTo(30);

    // Gold Scheme A1 (1L): chit_amount 100000, commission_percent 5.
    // commission = 5000; bid discount @30% = 30000; prize = 100000-30000-5000 = 65000.
    expect(parseFloat(res.body.data.prize_amount)).toBeCloseTo(65000);
    expect(parseFloat(res.body.data.commission_amount)).toBeCloseTo(5000);

    // Exactly one bid should be flagged winning — the DB's partial unique
    // index guarantees this, this just confirms the app set it correctly.
    const winners = await query(`SELECT count(*) FROM auction_bids WHERE auction_id = $1 AND is_winning_bid = true`, [auctionId]);
    expect(parseInt(winners.rows[0].count, 10)).toBe(1);
  });

  it('rejects completing an already-completed auction', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ winning_chit_member_id: '80000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(409);
  });

  it('rejects bidding on a completed auction', async () => {
    const res = await request(app)
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${token}`)
      .send({ chit_member_id: '80000000-0000-0000-0000-000000000001', bid_percent: 10 });
    expect(res.status).toBe(409);
  });
});
