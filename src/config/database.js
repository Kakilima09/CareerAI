/**
 * CareerAI Mentor — Database Connection & Schema Setup
 * Uses Node.js 24 built-in DatabaseSync SQLite for zero-friction local persistence.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.resolve(process.cwd(), process.env.DB_STORAGE_PATH || './data/careerai.sqlite');

let dbInstance = null;

function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      intent TEXT DEFAULT 'general_question',
      preset TEXT DEFAULT 'balanced',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'model', 'system')),
      content TEXT NOT NULL,
      intent TEXT DEFAULT 'general_question',
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mock_interviews (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      job_role TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      turn_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Ensure migration if conversations table already existed without user_id
  try {
    const columns = dbInstance.prepare(`PRAGMA table_info(conversations)`).all();
    const hasUserId = columns.some(c => c.name === 'user_id');
    if (!hasUserId) {
      dbInstance.exec(`ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;`);
    }
  } catch (err) {
    console.warn('[Database] Migration notice (conversations.user_id):', err.message);
  }

  // Ensure migration if users table already existed without role
  try {
    const userColumns = dbInstance.prepare(`PRAGMA table_info(users)`).all();
    const hasRole = userColumns.some(c => c.name === 'role');
    if (!hasRole) {
      dbInstance.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
    }
  } catch (err) {
    console.warn('[Database] Migration notice (users.role):', err.message);
  }

  // Create indexes
  dbInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  return dbInstance;
}

module.exports = {
  getDatabase,
  closeDatabase: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};
