import request from 'supertest';
import { createApp } from '@/app';
import { pool } from '@/db/pool';

const app = createApp();

const SUPER_ADMIN_PHONE = '9000000001'; // Dev Admin One, seeded with role Super Admin
const STAFF_PHONE = '9000000003'; // Dev Staff One, seeded with role Staff
const PASSWORD = 'devpassword123';

afterAll(async () => {
  await pool.end();
});

describe('POST /api/v1/auth/login', () => {
  it('rejects an unknown phone number with 401 and a generic message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '9999999999', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed request body with 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in successfully with correct credentials and never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.roles).toContain('Super Admin');
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user and their permission set for a valid token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
    const token = login.body.data.accessToken;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.roles).toContain('Super Admin');
    expect(res.body.data.permissions).toEqual(expect.arrayContaining(['customers:write', 'payments:write']));
  });
});

describe('Role-based authorization', () => {
  it('a Staff-role user is FORBIDDEN from reading branches (branches:read not granted to Staff)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: PASSWORD });
    const token = login.body.data.accessToken;

    const branches = await request(app).get('/api/v1/branches').set('Authorization', `Bearer ${token}`);
    expect(branches.status).toBe(403);
    expect(branches.body.error.code).toBe('FORBIDDEN');
  });

  it('a Staff-role user IS allowed to read customers', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: PASSWORD });
    const token = login.body.data.accessToken;
    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('a Staff-role user is FORBIDDEN from creating a chit scheme (chit_schemes:write not granted to Staff)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: PASSWORD });
    const token = login.body.data.accessToken;
    const res = await request(app)
      .post('/api/v1/chit-schemes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'x', scheme_code: 'X1', chit_amount: 10000, member_count: 10, duration_periods: 10, frequency: 'monthly', installment_amount: 1000 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('a Super Admin CAN create a chit scheme', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
    const token = login.body.data.accessToken;
    const res = await request(app)
      .post('/api/v1/chit-schemes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Scheme For Auth Suite', scheme_code: `AUTH-TEST-${Date.now()}`,
        chit_amount: 10000, member_count: 10, duration_periods: 10, frequency: 'monthly', installment_amount: 1000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Scheme For Auth Suite');
  });
});

describe('Refresh token lifecycle', () => {
  it('issues a new access token via refresh, and rejects reuse of the rotated-out token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
    const originalRefreshToken = login.body.data.refreshToken;

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: originalRefreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();

    // Reusing the now-rotated-out original token must fail.
    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: originalRefreshToken });
    expect(reuse.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('revokes the session so the refresh token can no longer be used', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: SUPER_ADMIN_PHONE, password: PASSWORD });
    const refreshToken = login.body.data.refreshToken;

    const logoutRes = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const afterLogout = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(afterLogout.status).toBe(401);
  });
});

describe('Password reset flow', () => {
  it('requests a reset token (returned only in non-production) and confirms it, invalidating old sessions', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: PASSWORD });
    const oldRefreshToken = login.body.data.refreshToken;

    const requestRes = await request(app).post('/api/v1/auth/password-reset/request').send({ phone: STAFF_PHONE });
    expect(requestRes.status).toBe(200);
    const devToken = requestRes.body.data.devToken;
    expect(devToken).toBeDefined(); // NODE_ENV=test, so the token is returned for testability

    const confirmRes = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: devToken, newPassword: 'brandNewPassword123' });
    expect(confirmRes.status).toBe(200);

    // Old session must now be dead.
    const refreshAfterReset = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefreshToken });
    expect(refreshAfterReset.status).toBe(401);

    // New password works.
    const newLogin = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: 'brandNewPassword123' });
    expect(newLogin.status).toBe(200);

    // Old password no longer works.
    const oldLoginAttempt = await request(app).post('/api/v1/auth/login').send({ phone: STAFF_PHONE, password: PASSWORD });
    expect(oldLoginAttempt.status).toBe(401);

    // Restore original password so other tests/runs relying on it keep working.
    await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${newLogin.body.data.accessToken}`)
      .send({ currentPassword: 'brandNewPassword123', newPassword: PASSWORD });
  });

  it('does not reveal whether a phone number is registered', async () => {
    const res = await request(app).post('/api/v1/auth/password-reset/request').send({ phone: '9888888888' });
    expect(res.status).toBe(200);
    expect(res.body.data.devToken).toBeUndefined();
  });
});
