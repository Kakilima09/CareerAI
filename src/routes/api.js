/**
 * CareerAI Mentor — API Route Definitions
 */

const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const SpecializedController = require('../controllers/specializedController');
const AuthController = require('../controllers/authController');
const DashboardController = require('../controllers/dashboardController');
const AdminController = require('../controllers/adminController');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Configuration
router.get('/config', ChatController.getConfig);

// Authentication routes
router.post('/auth/register', apiLimiter, AuthController.register);
router.post('/auth/login', apiLimiter, AuthController.login);
router.get('/auth/me', requireAuth, AuthController.me);

// User dashboard (authenticated)
router.get('/dashboard/stats', requireAuth, DashboardController.stats);

// Admin (authenticated + role admin)
router.get('/admin/stats', requireAuth, requireAdmin, AdminController.stats);
router.get('/admin/users', requireAuth, requireAdmin, AdminController.listUsers);
router.get('/admin/conversations', requireAuth, requireAdmin, AdminController.listConversations);
router.delete('/admin/conversations/:id', requireAuth, requireAdmin, AdminController.deleteConversation);
router.delete('/admin/users/:id', requireAuth, requireAdmin, AdminController.deleteUser);

// Conversation management (User-scoped with optionalAuth)
router.get('/conversations', optionalAuth, ChatController.listConversations);
router.post('/conversations', optionalAuth, ChatController.createConversation);
router.get('/conversations/:id', optionalAuth, ChatController.getConversation);
router.delete('/conversations/:id', optionalAuth, ChatController.deleteConversation);

// Main Chat interaction (Rate limited & User-scoped)
router.post('/chat', optionalAuth, apiLimiter, ChatController.sendMessage);

// Specialized career modules (Rate limited & User-scoped)
router.post('/specialized/cv-review', optionalAuth, apiLimiter, SpecializedController.cvReview);
router.post('/specialized/skill-gap', optionalAuth, apiLimiter, SpecializedController.skillGap);
router.post('/specialized/roadmap', optionalAuth, apiLimiter, SpecializedController.roadmap);
router.post('/specialized/mock-interview', optionalAuth, apiLimiter, SpecializedController.mockInterview);

module.exports = router;
