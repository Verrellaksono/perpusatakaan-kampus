const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // Basic validation
      if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi.' });
      }

      // Find user
      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Username atau password salah.' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Username atau password salah.' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'perpustakaan_kampus_secret_key_2026',
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login berhasil.',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Error on login:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
  }

  static async logout(req, res) {
    return res.status(200).json({ message: 'Logout berhasil.' });
  }

  static async verifyToken(req, res) {
    // If it reaches here, authMiddleware already verified it
    return res.status(200).json({
      valid: true,
      user: req.user
    });
  }
}

module.exports = AuthController;
