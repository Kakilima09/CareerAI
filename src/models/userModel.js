/**
 * CareerAI Mentor — User Model
 * Data access and password hashing for user accounts.
 */

const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

class UserModel {
  /**
   * Create a new user with hashed password
   */
  static createUser({ name, email, password, role = 'user' }) {
    const db = getDatabase();
    const id = randomUUID();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role === 'admin' ? 'admin' : 'user';
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name.trim(), normalizedEmail, passwordHash, normalizedRole, now, now);

    return {
      id,
      name: name.trim(),
      email: normalizedEmail,
      role: normalizedRole,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Find user by email (includes password_hash for authentication)
   */
  static findByEmail(email) {
    if (!email) return null;
    const db = getDatabase();
    const normalizedEmail = email.toLowerCase().trim();
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    return stmt.get(normalizedEmail) || null;
  }

  /**
   * Find user by ID (excludes password_hash for security)
   */
  static findById(id) {
    if (!id) return null;
    const db = getDatabase();
    const stmt = db.prepare(`SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?`);
    return stmt.get(id) || null;
  }

  /**
   * List all users with their conversation counts (admin)
   */
  static findAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) AS conversation_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
  }

  /**
   * Count total registered users (admin)
   */
  static countAll() {
    const db = getDatabase();
    return db.prepare(`SELECT COUNT(*) AS total FROM users`).get().total;
  }

  /**
   * Count users by role (admin)
   */
  static countByRole(role) {
    const db = getDatabase();
    return db.prepare(`SELECT COUNT(*) AS total FROM users WHERE role = ?`).get(role).total;
  }

  /**
   * Delete a user by id (cascades conversations & messages)
   */
  static deleteById(id) {
    const db = getDatabase();
    const info = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    return info.changes > 0;
  }

  /**
   * Check if password matches hash
   */
  static verifyPassword(plainPassword, passwordHash) {
    if (!plainPassword || !passwordHash) return false;
    return bcrypt.compareSync(plainPassword, passwordHash);
  }

  /**
   * Ensure a bootstrap admin account exists (from env).
   * Returns the created/existing admin user, or null if not configured.
   */
  static seedAdmin() {
    const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || !password) return null;

    const existing = UserModel.findByEmail(email);
    if (existing) {
      if (existing.role !== 'admin') {
        getDatabase().prepare(`UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?`)
          .run(new Date().toISOString(), existing.id);
        existing.role = 'admin';
      }
      return existing;
    }

    return UserModel.createUser({
      name: process.env.ADMIN_NAME || 'Administrator',
      email,
      password,
      role: 'admin'
    });
  }
}

module.exports = UserModel;
