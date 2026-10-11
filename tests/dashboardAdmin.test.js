/**
 * Integration Tests for User Dashboard & Admin Panel (roles, stats, management)
 */

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'mock-api-key-for-test-suite';
process.env.ADMIN_EMAILS = 'admin.dash@example.com';

const request = require('supertest');
const app = require('../src/app');
const { closeDatabase } = require('../src/config/database');

describe('Dashboard & Admin', () => {
  let originalFetch;
  let userToken;
  let adminToken;
  let adminId;
  let userConvId;

  beforeAll(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '1. Direct answer: siap\n2. Analisis...' }] }, finishReason: 'STOP' }]
      })
    });

    const userRes = await request(app).post('/api/auth/register')
      .send({ name: 'Regular User', email: 'regular.dash@example.com', password: 'password123' });
    userToken = userRes.body.data.token;

    const adminRes = await request(app).post('/api/auth/register')
      .send({ name: 'Dash Admin', email: 'admin.dash@example.com', password: 'password123' });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    closeDatabase();
  });

  test('registration assigns admin role to ADMIN_EMAILS address', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(me.body.data.user.role).toBe('admin');

    const meUser = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
    expect(meUser.body.data.user.role).toBe('user');
  });

  describe('GET /api/dashboard/stats', () => {
    test('requires authentication (401)', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.statusCode).toBe(401);
    });

    test('returns user-scoped statistics and persists activity', async () => {
      // User creates a conversation + sends one chat message (mocked Gemini)
      const conv = await request(app).post('/api/conversations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Roadmap saya', intent: 'learning_roadmap' });
      userConvId = conv.body.data.id;

      await request(app).post('/api/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Buatkan roadmap data analyst', conversationId: userConvId });

      const res = await request(app).get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe('regular.dash@example.com');
      expect(res.body.data.totalConversations).toBe(1);
      expect(res.body.data.totalMessages).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data.intents)).toBe(true);
      expect(res.body.data.intents.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.recentConversations)).toBe(true);
    });
  });

  describe('Admin endpoints', () => {
    test('admin stats are forbidden for regular users (403)', async () => {
      const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    test('admin stats requires a token (401)', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.statusCode).toBe(401);
    });

    test('admin can read aggregate stats', async () => {
      const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
      expect(res.body.data.adminCount).toBeGreaterThanOrEqual(1);
    });

    test('admin can list users', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      const emails = res.body.data.map(u => u.email);
      expect(emails).toContain('admin.dash@example.com');
      expect(emails).toContain('regular.dash@example.com');
      expect(res.body.data[0].password_hash).toBeUndefined();
    });

    test('admin can list all conversations with owner info', async () => {
      const res = await request(app).get('/api/admin/conversations').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      const conv = res.body.data.find(c => c.id === userConvId);
      expect(conv).toBeDefined();
      expect(conv.owner_email).toBe('regular.dash@example.com');
    });

    test('admin cannot delete their own account (400)', async () => {
      const res = await request(app).delete(`/api/admin/users/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
    });

    test('regular user cannot delete a conversation via admin route (403)', async () => {
      const res = await request(app)
        .delete(`/api/admin/conversations/${userConvId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    test('admin can delete a conversation', async () => {
      const res = await request(app)
        .delete(`/api/admin/conversations/${userConvId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
