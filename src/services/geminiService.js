/**
 * CareerAI Mentor — Google Gemini Service
 * Handles official REST integration, parameter validation, bounded history,
 * error handling (timeout, rate limit, invalid key, quota exhaustion),
 * and intent-specialized system instructions.
 */

const geminiConfig = require('../config/gemini');
const IntentClassifier = require('./intentClassifier');

class GeminiService {
  constructor(options = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : geminiConfig.apiKey;
    this.model = options.model || geminiConfig.defaultModel;
    this.baseUrl = options.baseUrl || geminiConfig.apiBaseUrl;
    this.timeoutMs = options.timeoutMs || geminiConfig.defaults.timeoutMs;
  }

  /**
   * Validate and sanitize AI generation parameters against acceptable ranges
   */
  validateParameters(params = {}) {
    const limits = geminiConfig.parameterLimits;
    const defaults = geminiConfig.defaults;

    let temperature = params.temperature !== undefined ? parseFloat(params.temperature) : defaults.temperature;
    if (isNaN(temperature) || temperature < limits.temperature.min || temperature > limits.temperature.max) {
      temperature = defaults.temperature;
    }

    let topP = params.topP !== undefined ? parseFloat(params.topP) : defaults.topP;
    if (isNaN(topP) || topP < limits.topP.min || topP > limits.topP.max) {
      topP = defaults.topP;
    }

    let topK = params.topK !== undefined ? parseInt(params.topK, 10) : defaults.topK;
    if (isNaN(topK) || topK < limits.topK.min || topK > limits.topK.max) {
      topK = defaults.topK;
    }

    let maxOutputTokens = params.maxOutputTokens !== undefined ? parseInt(params.maxOutputTokens, 10) : defaults.maxOutputTokens;
    if (isNaN(maxOutputTokens) || maxOutputTokens < limits.maxOutputTokens.min || maxOutputTokens > limits.maxOutputTokens.max) {
      maxOutputTokens = defaults.maxOutputTokens;
    }

    return { temperature, topP, topK, maxOutputTokens };
  }

  /**
   * Apply preset settings if requested
   */
  resolvePresetParameters(presetKey, customOverrides = {}) {
    const preset = geminiConfig.presets[presetKey];
    if (preset) {
      return this.validateParameters({
        temperature: preset.temperature,
        topP: preset.topP,
        topK: preset.topK,
        ...customOverrides
      });
    }
    return this.validateParameters(customOverrides);
  }

  /**
   * Generate content using the Gemini REST API
   */
  async generateContent({
    prompt,
    history = [],
    intent = 'general_question',
    preset = 'balanced',
    parameters = {},
    customModel = null
  }) {
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey.includes('your_gemini_api_key_here')) {
      throw new Error('GEMINI_API_KEY is not configured. Please set a valid API key in your .env file.');
    }

    const activeModel = customModel || this.model;
    const generationConfig = this.resolvePresetParameters(preset, parameters);

    // Build specialized system prompt with intent augmentation
    const intentAugmentation = IntentClassifier.getIntentPromptAugmentation(intent);
    const effectiveSystemPrompt = intentAugmentation
      ? `${geminiConfig.systemPrompt}\n\n${intentAugmentation}`
      : geminiConfig.systemPrompt;

    // Build contents payload with bounded history
    const contents = [];

    // Ensure history roles alternate or are properly grouped
    if (Array.isArray(history) && history.length > 0) {
      const boundedHistory = history.slice(-geminiConfig.defaults.maxHistoryMessages);
      for (const item of boundedHistory) {
        if (item.parts && item.parts.length > 0 && item.parts[0].text) {
          contents.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text }]
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: effectiveSystemPrompt }]
      },
      generationConfig
    };

    const endpointUrl = `${this.baseUrl}/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        this.handleApiErrors(response.status, data);
      }

      // Check for valid response candidate
      if (!data || !data.candidates || data.candidates.length === 0) {
        if (data && data.promptFeedback && data.promptFeedback.blockReason) {
          throw new Error(`Content blocked by Gemini safety filters: ${data.promptFeedback.blockReason}`);
        }
        throw new Error('Gemini API returned an empty or unparseable response.');
      }

      const candidate = data.candidates[0];

      // Handle finish reason check
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response was blocked due to safety guidelines.');
      }

      const textParts = candidate.content?.parts?.map(p => p.text).filter(Boolean) || [];
      const replyText = textParts.join('\n').trim();

      if (!replyText) {
        throw new Error('Received an empty response from Gemini model.');
      }

      return {
        reply: replyText,
        intent,
        preset,
        model: activeModel,
        parameters: generationConfig,
        finishReason: candidate.finishReason || 'STOP',
        usageMetadata: data.usageMetadata || null
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        const timeoutSeconds = Math.round(this.timeoutMs / 1000);
        throw new Error(`Request timed out after ${timeoutSeconds}s while contacting Gemini API. Please try again.`);
      }

      // Re-throw sanitized error without revealing private key
      throw err;
    }
  }

  /**
   * Translates HTTP error responses into clean, user-friendly messages
   */
  handleApiErrors(status, data) {
    const errorDetails = data?.error?.message || '';

    if (status === 400) {
      if (errorDetails.toLowerCase().includes('api_key') || errorDetails.toLowerCase().includes('api key not valid')) {
        throw new Error('Invalid Gemini API Key provided. Please verify your GEMINI_API_KEY in the .env file.');
      }
      if (errorDetails.toLowerCase().includes('model')) {
        throw new Error(`Gemini model error: ${errorDetails}. Please check GEMINI_MODEL in your configuration.`);
      }
      throw new Error(`Gemini Bad Request (400): ${errorDetails || 'Invalid request parameters'}`);
    }

    if (status === 403) {
      throw new Error('Access denied by Gemini API (403). Check your API Key permissions and billing status.');
    }

    if (status === 404) {
      throw new Error(`The requested Gemini model '${this.model}' was not found. Please choose an active model like 'gemini-1.5-flash'.`);
    }

    if (status === 429) {
      throw new Error('Gemini API rate limit exceeded (429). Too many requests sent; please wait a moment before trying again.');
    }

    if (status >= 500) {
      throw new Error(`Gemini Server Error (${status}). Google Generative AI service is temporarily unavailable.`);
    }

    throw new Error(`Gemini API error (${status}): ${errorDetails || 'Unknown error occurred'}`);
  }
}

module.exports = GeminiService;
