/**
 * CareerAI Mentor — Server Entry Point
 */

require('dotenv').config();
const app = require('./app');
const { getDatabase, closeDatabase } = require('./config/database');
const UserModel = require('./models/userModel');

const PORT = parseInt(process.env.PORT, 10) || 3000;

// Initialize Database connection & verify tables
try {
  getDatabase();
  console.log('[Database] SQLite persistence initialized successfully.');
} catch (err) {
  console.error('[Database] Failed to initialize SQLite storage:', err.message);
  process.exit(1);
}

// Ensure a bootstrap admin account exists (from ADMIN_EMAIL / ADMIN_PASSWORD)
try {
  const admin = UserModel.seedAdmin();
  if (admin) {
    console.log(`[Auth] Admin account ready: ${admin.email}`);
  }
} catch (err) {
  console.warn('[Auth] Admin seed skipped:', err.message);
}

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` CareerAI Mentor is running on http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'}`);
  console.log(` Login:   http://localhost:${PORT}/login.html`);
  console.log(` Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log('====================================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received. Closing HTTP server and database...');
  server.close(() => {
    closeDatabase();
    console.log('[Server] Server cleanly terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received. Shutting down...');
  server.close(() => {
    closeDatabase();
    console.log('[Server] Closed gracefully.');
    process.exit(0);
  });
});
