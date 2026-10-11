/**
 * CareerAI Mentor — Admin Controller
 * Administrative statistics and management for users and conversations.
 */

const UserModel = require('../models/userModel');
const ConversationModel = require('../models/conversationModel');

class AdminController {
  static async stats(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          totalUsers: UserModel.countAll(),
          adminCount: UserModel.countByRole('admin'),
          totalConversations: ConversationModel.countAllConversations(),
          totalMessages: ConversationModel.countAllMessages()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req, res, next) {
    try {
      res.json({ success: true, data: UserModel.findAll() });
    } catch (err) {
      next(err);
    }
  }

  static async listConversations(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
      res.json({ success: true, data: ConversationModel.getAllWithOwner(limit) });
    } catch (err) {
      next(err);
    }
  }

  static async deleteConversation(req, res, next) {
    try {
      const deleted = ConversationModel.deleteConversationAsAdmin(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Percakapan tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Percakapan berhasil dihapus.' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      if (id === req.user.id) {
        return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
      }
      const deleted = UserModel.deleteById(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
