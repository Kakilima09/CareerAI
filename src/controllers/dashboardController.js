/**
 * CareerAI Mentor — Dashboard Controller
 * Provides user-scoped statistics and recent activity for the user dashboard.
 */

const ConversationModel = require('../models/conversationModel');

class DashboardController {
  static async stats(req, res, next) {
    try {
      const userId = req.user.id;

      const totalConversations = ConversationModel.countConversations(userId);
      const totalMessages = ConversationModel.countMessages(userId);
      const intents = ConversationModel.getIntentBreakdown(userId);
      const recentConversations = ConversationModel.getAllConversations(userId).slice(0, 5);

      res.json({
        success: true,
        data: {
          user: req.user,
          memberSince: req.user.created_at,
          totalConversations,
          totalMessages,
          intents,
          recentConversations
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
