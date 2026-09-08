import request from 'supertest';
import { createApp } from '@/app';
import { pool, query } from '@/db/pool';

const app = createApp();

afterAll(async () => {
  await pool.end();
});

describe('GET /api/v1/public/chit-schemes', () => {
  it('returns schemes with no authentication required', async () => {
    const res = await request(app).get('/api/v1/public/chit-schemes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('never exposes internal-only fields like branch assignment or audit columns', async () => {
    const res = await request(app).get('/api/v1/public/chit-schemes');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/created_by|updated_by|deleted_at/);
  });

  it('only returns schemes marked show_on_website', async () => {
    await query(`UPDATE chit_schemes SET show_on_website = false WHERE scheme_code = 'SUPERJET-1L'`);
    const res = await request(app).get('/api/v1/public/chit-schemes');
    const codes = res.body.data.map((s: { scheme_code: string }) => s.scheme_code);
    expect(codes).not.toContain('SUPERJET-1L');
    await query(`UPDATE chit_schemes SET show_on_website = true WHERE scheme_code = 'SUPERJET-1L'`);
  });
});

describe('GET /api/v1/public/chit-schemes/:slug', () => {
  it('returns a single scheme by slug', async () => {
    const res = await request(app).get('/api/v1/public/chit-schemes/gold-a1-1l');
    expect(res.status).toBe(200);
    expect(res.body.data.scheme_code).toBe('GOLD-A1-1L');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/v1/public/chit-schemes/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/public/faqs', () => {
  it('returns published FAQs with no authentication', async () => {
    const res = await request(app).get('/api/v1/public/faqs');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('question');
    expect(res.body.data[0]).toHaveProperty('answer');
  });
});

describe('POST /api/v1/public/leads', () => {
  it('creates a lead with source=website and no authentication required', async () => {
    const res = await request(app)
      .post('/api/v1/public/leads')
      .send({ full_name: 'Website Visitor', phone: '9444444401', email: 'visitor@example.com', message: 'Interested in Gold Scheme' });
    expect(res.status).toBe(201);
    expect(res.body.data.success).toBe(true);

    const check = await query(`SELECT source, status, full_name FROM leads WHERE phone = '9444444401'`);
    expect(check.rows[0].source).toBe('website');
    expect(check.rows[0].status).toBe('new');
  });

  it('rejects a submission missing required fields', async () => {
    const res = await request(app).post('/api/v1/public/leads').send({ full_name: 'No Phone' });
    expect(res.status).toBe(422);
  });

  it('silently accepts (but does not persist) a honeypot-tripped submission', async () => {
    const res = await request(app)
      .post('/api/v1/public/leads')
      .send({ full_name: 'Bot', phone: '9555555501', website: 'http://spam.example.com' });
    expect(res.status).toBe(201);

    const check = await query(`SELECT count(*) FROM leads WHERE phone = '9555555501'`);
    expect(parseInt(check.rows[0].count, 10)).toBe(0);
  });

  it('rejects an interested_scheme_id that is not a plausible UUID', async () => {
    const res = await request(app)
      .post('/api/v1/public/leads')
      .send({ full_name: 'Bad Scheme Ref', phone: '9666666601', interested_scheme_id: 'not-a-uuid' });
    expect(res.status).toBe(422);
  });

  it('is rate-limited well before a real endpoint would need to worry about it', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        request(app).post('/api/v1/public/leads').send({ full_name: `Flood ${i}`, phone: `97777777${i}` }),
      ),
    );
    const tooMany = attempts.filter((r) => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });
});
