/**
 * Unit & Integration Tests for User Authentication & Authorization
 */

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'mock-api-key-for-test-suite';

const request = require('supertest');
const app = require('../src/app');
const { closeDatabase } = require('../src/config/database');

describe('Authentication & Authorization', () => {
  afterAll(() => {
    closeDatabase();
  });

  const testUser = {
    name: 'Budi Santoso',
    email: 'budi.santoso@example.com',
    password: 'password123'
  };

  let userAToken = null;
  let userBToken = null;

  describe('POST /api/auth/register', () => {
    test('successfully registers a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();

      userAToken = res.body.data.token;
    });

    test('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('sudah terdaftar');
    });

    test('validates minimum password length', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('minimal 6 karakter');
    });

    test('validates email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Format email tidak valid');
    });
  });

  describe('POST /api/auth/login', () => {
    test('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    test('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('salah');
    });

    test('rejects login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    test('returns user profile when authenticated with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    test('rejects request with missing token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Cross-User Data Isolation (Multi-Tenancy)', () => {
    let userAConvId = null;

    beforeAll(async () => {
      // Register User B
      const userBRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Siti Rahma',
          email: 'siti.rahma@example.com',
          password: 'password123'
        });
      userBToken = userBRes.body.data.token;

      // User A creates a conversation
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'User A Secret Roadmap', intent: 'learning_roadmap' });

      userAConvId = convRes.body.data.id;
    });

    test('User B cannot see User A conversation in conversation list', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toBe(200);
      const convIds = res.body.data.map(c => c.id);
      expect(convIds).not.toContain(userAConvId);
    });

    test('User B cannot access User A conversation by ID', async () => {
      const res = await request(app)
        .get(`/api/conversations/${userAConvId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toBe(404);
    });

    test('User B cannot delete User A conversation', async () => {
      const res = await request(app)
        .delete(`/api/conversations/${userAConvId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toBe(404);

      // Verify conversation still exists for User A
      const verifyRes = await request(app)
        .get(`/api/conversations/${userAConvId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(verifyRes.statusCode).toBe(200);
    });

    test('User B cannot use a specialized module against User A conversation (403)', async () => {
      const res = await request(app)
        .post('/api/specialized/cv-review')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetRole: 'Web Developer',
          cvText: 'This is a sufficiently long CV content used to verify cross-user ownership enforcement.',
          conversationId: userAConvId
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Guest cannot access User A conversation by ID', async () => {
      const res = await request(app)
        .get(`/api/conversations/${userAConvId}`);

      expect(res.statusCode).toBe(404);
    });

    test('User A can access and delete their own conversation', async () => {
      const delRes = await request(app)
        .delete(`/api/conversations/${userAConvId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.statusCode).toBe(200);

      const checkRes = await request(app)
        .get(`/api/conversations/${userAConvId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(checkRes.statusCode).toBe(404);
    });
  });
});
