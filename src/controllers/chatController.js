/**
 * CareerAI Mentor — Chat Controller
 * Manages conversational flow, message persistence, bounded history retrieval,
 * intent routing, and public configuration.
 */

const ConversationModel = require('../models/conversationModel');
const GeminiService = require('../services/geminiService');
const IntentClassifier = require('../services/intentClassifier');
const geminiConfig = require('../config/gemini');

const geminiService = new GeminiService();

class ChatController {
  /**
   * Return public non-sensitive configuration for the UI
   */
  static async getConfig(req, res) {
    res.json({
      success: true,
      data: {
        activeModel: geminiConfig.defaultModel,
        supportedModels: geminiConfig.supportedModels,
        presets: geminiConfig.presets,
        defaults: geminiConfig.defaults,
        parameterLimits: geminiConfig.parameterLimits,
        validIntents: IntentClassifier.getValidIntents(),
        hasApiKey: Boolean(geminiConfig.apiKey && geminiConfig.apiKey.trim() !== '' && !geminiConfig.apiKey.includes('your_gemini_api_key_here'))
      }
    });
  }

  /**
   * List all conversations for current user or guest
   */
  static async listConversations(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const conversations = ConversationModel.getAllConversations(userId);
      res.json({ success: true, data: conversations });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const { title, intent = 'general_question', preset = 'balanced' } = req.body || {};
      const conversation = ConversationModel.createConversation({ title, intent, preset, userId });
      res.status(201).json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a conversation by ID with its messages
   */
  static async getConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const conversation = ConversationModel.getConversationById(id, userId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
      }
      res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const deleted = ConversationModel.deleteConversation(id, userId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
      }
      res.json({ success: true, message: 'Conversation deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Main Chat Dispatcher
   */
  static async sendMessage(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const {
        message,
        conversationId,
        preset = 'balanced',
        parameters = {},
        customModel = null,
        explicitIntent = null
      } = req.body;

      // 1. Validate Input
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message content cannot be empty.'
        });
      }

      const trimmedMessage = message.trim();
      const MAX_MESSAGE_LENGTH = 4000;
      if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`
        });
      }

      // 2. Identify or Create Conversation
      let activeConvId = conversationId;
      let conversation = null;

      if (activeConvId) {
        conversation = ConversationModel.getConversationById(activeConvId, userId);
        if (!conversation) {
          return res.status(403).json({
            success: false,
            error: 'Akses ditolak: Anda tidak memiliki izin untuk percakapan ini.'
          });
        }
      }

      // Detect Intent
      const { intent } = IntentClassifier.resolveIntent(trimmedMessage, explicitIntent);

      if (!conversation) {
        // Generate an appropriate conversation title from first few words
        const autoTitle = trimmedMessage.slice(0, 38).trim() + (trimmedMessage.length > 38 ? '...' : '');
        conversation = ConversationModel.createConversation({
          title: autoTitle,
          intent,
          preset,
          userId
        });
        activeConvId = conversation.id;
      } else {
        // Update intent/preset if conversation exists
        ConversationModel.updateConversation(activeConvId, { intent, preset }, userId);
      }

      // 3. Fetch Bounded Context History
      const history = ConversationModel.getBoundedHistory(activeConvId, geminiConfig.defaults.maxHistoryMessages);

      // 4. Save User Message
      const userMessage = ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'user',
        content: trimmedMessage,
        intent
      });

      // 5. Call Gemini Service
      const geminiResult = await geminiService.generateContent({
        prompt: trimmedMessage,
        history,
        intent,
        preset,
        parameters,
        customModel
      });

      // 6. Save AI Response
      const modelMessage = ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'model',
        content: geminiResult.reply,
        intent
      });

      // 7. Return Result
      res.json({
        success: true,
        data: {
          reply: geminiResult.reply,
          conversationId: activeConvId,
          intent,
          preset,
          model: geminiResult.model,
          parameters: geminiResult.parameters,
          userMessage,
          modelMessage
        }
      });

    } catch (err) {
      next(err);
    }
  }
}

module.exports = ChatController;
