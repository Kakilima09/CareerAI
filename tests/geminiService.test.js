/**
 * Unit & Integration Tests for GeminiService
 * Mocks HTTP fetch to avoid making actual API calls.
 */

const GeminiService = require('../src/services/geminiService');

describe('GeminiService', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Parameter Validation & Presets', () => {
    const service = new GeminiService({ apiKey: 'fake-key-for-test' });

    test('validates and clamps parameters within acceptable ranges', () => {
      const valid = service.validateParameters({
        temperature: 0.5,
        topP: 0.85,
        topK: 30,
        maxOutputTokens: 1024
      });

      expect(valid.temperature).toBe(0.5);
      expect(valid.topP).toBe(0.85);
      expect(valid.topK).toBe(30);
      expect(valid.maxOutputTokens).toBe(1024);
    });

    test('falls back to defaults when parameters exceed range limits', () => {
      const clamped = service.validateParameters({
        temperature: 5.5, // exceeds 2.0
        topP: -0.2, // invalid
        topK: 500, // exceeds 100
        maxOutputTokens: 99999 // exceeds 8192
      });

      expect(clamped.temperature).toBe(0.7); // default
      expect(clamped.topP).toBe(0.9);
      expect(clamped.topK).toBe(40);
      expect(clamped.maxOutputTokens).toBe(2048);
    });

    test('resolves presets correctly', () => {
      const accurate = service.resolvePresetParameters('accurate');
      expect(accurate.temperature).toBe(0.2);

      const creative = service.resolvePresetParameters('creative');
      expect(creative.temperature).toBe(1.0);
    });
  });

  describe('API Key Validation', () => {
    test('throws descriptive error if GEMINI_API_KEY is not set', async () => {
      const service = new GeminiService({ apiKey: '' });
      await expect(service.generateContent({ prompt: 'Hello' }))
        .rejects
        .toThrow('GEMINI_API_KEY is not configured');
    });
  });

  describe('Mocked Gemini HTTP Responses', () => {
    test('successfully parses valid Gemini API 200 response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '1. Direct answer: Berikut rekomendasi karier...\n2. Analisis...' }]
            },
            finishReason: 'STOP'
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const service = new GeminiService({ apiKey: 'valid-test-key' });
      const result = await service.generateContent({
        prompt: 'Rekomendasi karir web dev',
        intent: 'career_advice'
      });

      expect(result.reply).toContain('1. Direct answer:');
      expect(result.finishReason).toBe('STOP');
      expect(result.intent).toBe('career_advice');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('handles 400 Invalid API Key error gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            message: 'API_KEY_INVALID: API key not valid. Please pass a valid API key.',
            status: 'INVALID_ARGUMENT'
          }
        })
      });

      const service = new GeminiService({ apiKey: 'bad-key' });
      await expect(service.generateContent({ prompt: 'Test' }))
        .rejects
        .toThrow('Invalid Gemini API Key provided');
    });

    test('handles 429 Rate Limit error gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
            status: 'RESOURCE_EXHAUSTED'
          }
        })
      });

      const service = new GeminiService({ apiKey: 'test-key' });
      await expect(service.generateContent({ prompt: 'Test' }))
        .rejects
        .toThrow('Gemini API rate limit exceeded');
    });

    test('handles request timeout gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const service = new GeminiService({ apiKey: 'test-key', timeoutMs: 1000 });
      await expect(service.generateContent({ prompt: 'Test' }))
        .rejects
        .toThrow('Request timed out');
    });

    test('handles safety filter blocks properly', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [],
          promptFeedback: {
            blockReason: 'SAFETY'
          }
        })
      });

      const service = new GeminiService({ apiKey: 'test-key' });
      await expect(service.generateContent({ prompt: 'Unsafe prompt' }))
        .rejects
        .toThrow('Content blocked by Gemini safety filters: SAFETY');
    });
  });
});
