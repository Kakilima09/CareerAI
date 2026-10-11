/**
 * CareerAI Mentor — Authentication Middleware
 * Validates JWT tokens and protects private endpoints.
 */

const { verifyToken } = require('../config/auth');
const UserModel = require('../models/userModel');

/**
 * Strict authentication middleware: requires a valid JWT Bearer token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.'
    });
  }

  const user = UserModel.findById(decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User account not found.'
    });
  }

  req.user = user;
  next();
}

/**
 * Optional authentication middleware: attaches req.user if token is present and valid,
 * otherwise lets the request proceed with req.user = null (allowing guest access).
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  req.user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded && decoded.id) {
      const user = UserModel.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  }

  next();
}

/**
 * Admin-only middleware: requires a valid token AND role === 'admin'
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak: halaman ini hanya untuk administrator.'
      });
    }
    next();
  });
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin
};
