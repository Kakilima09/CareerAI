/**
 * CareerAI Mentor — Auth Controller
 * Handles user registration, login, and profile retrieval.
 */

const UserModel = require('../models/userModel');
const { generateToken } = require('../config/auth');

class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body || {};

      // 1. Validation
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Nama harus diisi dengan minimal 2 karakter.'
        });
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Email wajib diisi.'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Format email tidak valid.'
        });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password harus terdiri dari minimal 6 karakter.'
        });
      }

      // 2. Check duplicate email
      const existing = UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Email sudah terdaftar. Silakan masuk menggunakan akun Anda.'
        });
      }

      // 3. Resolve role (emails listed in ADMIN_EMAILS become administrators)
      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      const role = adminEmails.includes(email.trim().toLowerCase()) ? 'admin' : 'user';

      // 4. Create User
      const user = UserModel.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role
      });

      // 5. Generate JWT
      const token = generateToken({ id: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil.',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Log in an existing user
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email dan password wajib diisi.'
        });
      }

      const user = UserModel.findByEmail(email);
      if (!user || !UserModel.verifyPassword(password, user.password_hash)) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password yang Anda masukkan salah.'
        });
      }

      const token = generateToken({ id: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Login berhasil.',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user'
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async me(req, res) {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  }
}

module.exports = AuthController;
