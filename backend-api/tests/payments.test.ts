import request from 'supertest';
import { createApp } from '@/app';
import { pool, query } from '@/db/pool';

const app = createApp();
const SUPER_ADMIN_PHONE = '9000000001';
const PASSWORD = 'devpassword123';

let token: string;
let freshInstallmentId: string;

beforeAll(async () => {
  const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
  token = login.body.data.accessToken;

  // Create an isolated installment for this suite rather than reusing a
  // fixed seeded row — running the suite twice against the same database
  // (without a reset in between) must not see stale state from a prior run.
  const result = await query<{ id: string }>(
    `INSERT INTO installments (chit_member_id, cycle_number, due_date, due_amount)
     VALUES ('80000000-0000-0000-0000-000000000002', $1, CURRENT_DATE, 10000.00)
     RETURNING id`,
    [900 + Math.floor(Math.random() * 100000)],
  );
  freshInstallmentId = result.rows[0].id;
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/v1/payments', () => {
  it('records a partial payment and updates the installment status to partial', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ installment_id: freshInstallmentId, amount: 4000, payment_method: 'cash' });
    expect(res.status).toBe(201);
    expect(res.body.data.receipt_number).toMatch(/^RCPT-/);

    const inst = await query('SELECT paid_amount, status FROM installments WHERE id = $1', [freshInstallmentId]);
    expect(parseFloat(inst.rows[0].paid_amount)).toBeCloseTo(4000);
    expect(inst.rows[0].status).toBe('partial');
  });

  it('rejects a payment that would exceed the remaining balance', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ installment_id: freshInstallmentId, amount: 999999, payment_method: 'cash' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('completes the installment to "paid" once the remaining balance is settled', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ installment_id: freshInstallmentId, amount: 6000, payment_method: 'upi', reference_number: `TEST-${Date.now()}` });
    expect(res.status).toBe(201);

    const inst = await query('SELECT paid_amount, status FROM installments WHERE id = $1', [freshInstallmentId]);
    expect(parseFloat(inst.rows[0].paid_amount)).toBeCloseTo(10000);
    expect(inst.rows[0].status).toBe('paid');
  });

  it('rejects a request missing required fields with a validation error', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/payments/:id/reverse', () => {
  let reversalInstallmentId: string;
  let reversalPaymentId: string;

  beforeAll(async () => {
    // Create an isolated installment (on the existing seeded chit_member)
    // dedicated to this test, so it doesn't collide with the payment
    // lifecycle exercised in the block above.
    const inst = await query<{ id: string }>(
      `INSERT INTO installments (chit_member_id, cycle_number, due_date, due_amount)
       VALUES ('80000000-0000-0000-0000-000000000001', $1, CURRENT_DATE, 5000.00)
       RETURNING id`,
      [900 + Math.floor(Math.random() * 100000)], // random cycle_number avoids collision on repeated test runs
    );
    reversalInstallmentId = inst.rows[0].id;

    const payRes = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ installment_id: reversalInstallmentId, amount: 5000, payment_method: 'cash' });
    reversalPaymentId = payRes.body.data.id;
  });

  it('confirms the installment is fully paid before reversal', async () => {
    const inst = await query('SELECT paid_amount, status FROM installments WHERE id = $1', [reversalInstallmentId]);
    expect(parseFloat(inst.rows[0].paid_amount)).toBeCloseTo(5000);
    expect(inst.rows[0].status).toBe('paid');
  });

  it('reverses the payment and rolls the installment back to pending', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${reversalPaymentId}/reverse`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Test suite: verifying reversal rolls back installment state' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('reversed');

    const inst = await query('SELECT paid_amount, status FROM installments WHERE id = $1', [reversalInstallmentId]);
    expect(parseFloat(inst.rows[0].paid_amount)).toBeCloseTo(0);
    expect(inst.rows[0].status).toBe('pending');
  });

  it('rejects reversing the same payment twice', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${reversalPaymentId}/reverse`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'second attempt' });
    expect(res.status).toBe(409);
  });

  it('returns 404 when reversing a payment that does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/payments/00000000-0000-0000-0000-000000000000/reverse')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'test' });
    expect(res.status).toBe(404);
  });
});
