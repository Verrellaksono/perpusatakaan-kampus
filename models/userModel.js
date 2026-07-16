const db = require('./db');

class UserModel {
  static async findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?;', [username]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?;', [id]);
    return rows[0];
  }
}

module.exports = UserModel;
