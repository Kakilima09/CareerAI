/**
 * Integration Tests for CareerAI Mentor Express API Endpoints
 */

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'mock-api-key-for-test-suite';

const request = require('supertest');
const app = require('../src/app');
const { closeDatabase } = require('../src/config/database');

describe('API Endpoints', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Mock successful Gemini response by default
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '1. Direct answer: Respons karier profesional\n2. Analisis...' }]
            },
            finishReason: 'STOP'
          }
        ]
      })
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    closeDatabase();
  });

  test('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /api/config returns public config without leaking API key', async () => {
    const res = await request(app).get('/api/config');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeModel).toBeDefined();
    expect(res.body.data.presets).toBeDefined();
    expect(res.body.data.hasApiKey).toBe(true);
    expect(res.body.data.apiKey).toBeUndefined(); // Crucial: never leak API key
  });

  test('POST /api/chat rejects empty message with 400', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('cannot be empty');
  });

  test('POST /api/chat rejects oversized message (> 4000 chars) with 400', async () => {
    const oversizedMessage = 'a'.repeat(4001);
    const res = await request(app)
      .post('/api/chat')
      .send({ message: oversizedMessage });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('exceeds maximum allowed length');
  });

  test('POST /api/chat processes valid message and persists conversation', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'Bagaimana cara beralih karir menjadi UI/UX Designer?',
        preset: 'balanced'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain('Direct answer:');
    expect(res.body.data.conversationId).toBeDefined();
    expect(res.body.data.intent).toBe('career_advice');
  });

  test('Conversation CRUD: List, Fetch by ID, and Delete', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/conversations')
      .send({ title: 'Test Conversation CRUD', intent: 'cv_review' });

    expect(createRes.statusCode).toBe(201);
    const convId = createRes.body.data.id;

    // 2. Fetch
    const getRes = await request(app).get(`/api/conversations/${convId}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.title).toBe('Test Conversation CRUD');

    // 3. List
    const listRes = await request(app).get('/api/conversations');
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    // 4. Delete
    const deleteRes = await request(app).delete(`/api/conversations/${convId}`);
    expect(deleteRes.statusCode).toBe(200);

    // Verify deleted
    const verifyRes = await request(app).get(`/api/conversations/${convId}`);
    expect(verifyRes.statusCode).toBe(404);
  });

  test('POST /api/specialized/cv-review validates minimum text length', async () => {
    const res = await request(app)
      .post('/api/specialized/cv-review')
      .send({
        targetRole: 'Web Developer',
        cvText: 'Too short'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('at least 20 characters');
  });
});
