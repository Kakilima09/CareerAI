/**
 * CareerAI Mentor — Conversation Model
 * Data access methods for conversations, message history, and mock interview states.
 */

const { randomUUID } = require('node:crypto');
const { getDatabase } = require('../config/database');

class ConversationModel {
  static createConversation({ title = 'New Conversation', intent = 'general_question', preset = 'balanced', userId = null } = {}) {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO conversations (id, user_id, title, intent, preset, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, title, intent, preset, now, now);

    return { id, user_id: userId, title, intent, preset, created_at: now, updated_at: now, message_count: 0 };
  }

  static getAllConversations(userId = null) {
    const db = getDatabase();
    let query = `
      SELECT 
        c.id, 
        c.user_id,
        c.title, 
        c.intent, 
        c.preset, 
        c.created_at, 
        c.updated_at,
        COUNT(m.id) AS message_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
    `;

    if (userId) {
      query += ` WHERE c.user_id = ? GROUP BY c.id ORDER BY c.updated_at DESC`;
      return db.prepare(query).all(userId);
    } else {
      query += ` WHERE c.user_id IS NULL GROUP BY c.id ORDER BY c.updated_at DESC`;
      return db.prepare(query).all();
    }
  }

  static getConversationById(id, userId = null) {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM conversations WHERE id = ?`);
    const conversation = stmt.get(id);
    if (!conversation) return null;

    // Strict ownership: owner id must match exactly (guest == null owner)
    if ((conversation.user_id ?? null) !== (userId ?? null)) {
      return null;
    }

    const messagesStmt = db.prepare(`
      SELECT id, role, content, intent, created_at 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `);
    conversation.messages = messagesStmt.all(id);
    return conversation;
  }

  static updateConversation(id, { title, intent, preset } = {}, userId = null) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const current = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
    if (!current) return null;

    // Strict ownership: owner id must match exactly (guest == null owner)
    if ((current.user_id ?? null) !== (userId ?? null)) {
      return null;
    }

    const newTitle = title !== undefined ? title : current.title;
    const newIntent = intent !== undefined ? intent : current.intent;
    const newPreset = preset !== undefined ? preset : current.preset;

    const stmt = db.prepare(`
      UPDATE conversations 
      SET title = ?, intent = ?, preset = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(newTitle, newIntent, newPreset, now, id);

    return { id, user_id: current.user_id, title: newTitle, intent: newIntent, preset: newPreset, updated_at: now };
  }

  static deleteConversation(id, userId = null) {
    const db = getDatabase();
    if (userId) {
      const stmt = db.prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`);
      const info = stmt.run(id, userId);
      return info.changes > 0;
    } else {
      const stmt = db.prepare(`DELETE FROM conversations WHERE id = ? AND user_id IS NULL`);
      const info = stmt.run(id);
      return info.changes > 0;
    }
  }

  static addMessage({ conversationId, role, content, intent = 'general_question' }) {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, intent, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, conversationId, role, content, intent, now);

    // Touch conversation updated_at
    db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(now, conversationId);

    return { id, conversation_id: conversationId, role, content, intent, created_at: now };
  }

  static getBoundedHistory(conversationId, limit = 10) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT role, content 
      FROM (
        SELECT role, content, created_at, rowid 
        FROM messages 
        WHERE conversation_id = ? AND role IN ('user', 'model')
        ORDER BY created_at DESC, rowid DESC 
        LIMIT ?
      ) 
      ORDER BY created_at ASC, rowid ASC
    `);
    const rows = stmt.all(conversationId, limit);

    // Transform into Gemini Contents format: { role: 'user'|'model', parts: [{ text }] }
    return rows.map(r => ({
      role: r.role === 'model' ? 'model' : 'user',
      parts: [{ text: r.content }]
    }));
  }

  // Mock interview session handling
  static saveMockInterview({ conversationId, jobRole, difficulty }) {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const existing = db.prepare(`SELECT * FROM mock_interviews WHERE conversation_id = ?`).get(conversationId);
    if (existing) {
      db.prepare(`
        UPDATE mock_interviews 
        SET job_role = ?, difficulty = ?, turn_count = 0, status = 'active', summary = NULL, updated_at = ?
        WHERE conversation_id = ?
      `).run(jobRole, difficulty, now, conversationId);
      return { id: existing.id, conversation_id: conversationId, job_role: jobRole, difficulty, turn_count: 0, status: 'active' };
    }

    const stmt = db.prepare(`
      INSERT INTO mock_interviews (id, conversation_id, job_role, difficulty, turn_count, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 'active', ?, ?)
    `);
    stmt.run(id, conversationId, jobRole, difficulty, now, now);
    return { id, conversation_id: conversationId, job_role: jobRole, difficulty, turn_count: 0, status: 'active' };
  }

  static getMockInterview(conversationId) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM mock_interviews WHERE conversation_id = ?`).get(conversationId);
  }

  static incrementMockInterviewTurn(conversationId, newSummary = null, isFinished = false) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const current = db.prepare(`SELECT * FROM mock_interviews WHERE conversation_id = ?`).get(conversationId);
    if (!current) return null;

    const newCount = current.turn_count + 1;
    const newStatus = isFinished ? 'completed' : current.status;
    const summary = newSummary || current.summary;

    db.prepare(`
      UPDATE mock_interviews 
      SET turn_count = ?, status = ?, summary = ?, updated_at = ?
      WHERE conversation_id = ?
    `).run(newCount, newStatus, summary, now, conversationId);

    return { ...current, turn_count: newCount, status: newStatus, summary };
  }

  // --- Dashboard aggregates (user-scoped) ---
  static countConversations(userId = null) {
    const db = getDatabase();
    if (userId) {
      return db.prepare(`SELECT COUNT(*) AS total FROM conversations WHERE user_id = ?`).get(userId).total;
    }
    return db.prepare(`SELECT COUNT(*) AS total FROM conversations WHERE user_id IS NULL`).get().total;
  }

  static countMessages(userId = null) {
    const db = getDatabase();
    if (userId) {
      return db.prepare(`
        SELECT COUNT(*) AS total FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = ?
      `).get(userId).total;
    }
    return db.prepare(`
      SELECT COUNT(*) AS total FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id IS NULL
    `).get().total;
  }

  static getIntentBreakdown(userId = null) {
    const db = getDatabase();
    if (userId) {
      return db.prepare(`
        SELECT intent, COUNT(*) AS total
        FROM conversations
        WHERE user_id = ?
        GROUP BY intent
        ORDER BY total DESC
      `).all(userId);
    }
    return db.prepare(`
      SELECT intent, COUNT(*) AS total
      FROM conversations
      WHERE user_id IS NULL
      GROUP BY intent
      ORDER BY total DESC
    `).all();
  }

  // --- Admin aggregates (all users) ---
  static countAllConversations() {
    const db = getDatabase();
    return db.prepare(`SELECT COUNT(*) AS total FROM conversations`).get().total;
  }

  static countAllMessages() {
    const db = getDatabase();
    return db.prepare(`SELECT COUNT(*) AS total FROM messages`).get().total;
  }

  static getAllWithOwner(limit = 100) {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.title,
        c.intent,
        c.preset,
        c.created_at,
        c.updated_at,
        u.name AS owner_name,
        u.email AS owner_email,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.updated_at DESC
      LIMIT ?
    `).all(limit);
  }

  static deleteConversationAsAdmin(id) {
    const db = getDatabase();
    const info = db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
    return info.changes > 0;
  }
}

module.exports = ConversationModel;
