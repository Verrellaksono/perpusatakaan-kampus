const db = require('./db');

class PeminjamModel {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM peminjam ORDER BY nama ASC;');
    return rows;
  }

  static async getByNim(nim) {
    const [rows] = await db.query('SELECT * FROM peminjam WHERE nim = ?;', [nim]);
    return rows[0];
  }

  static async getByEmail(email) {
    const [rows] = await db.query('SELECT * FROM peminjam WHERE email = ?;', [email]);
    return rows[0];
  }

  static async create(peminjam) {
    const { nim, nama, email, no_telepon } = peminjam;
    const [result] = await db.query(
      `INSERT INTO peminjam (nim, nama, email, no_telepon) 
       VALUES (?, ?, ?, ?);`,
      [nim, nama, email, no_telepon]
    );
    return result.affectedRows > 0;
  }

  static async update(nim, peminjam) {
    const { nama, email, no_telepon } = peminjam;
    const [result] = await db.query(
      `UPDATE peminjam 
       SET nama = ?, email = ?, no_telepon = ? 
       WHERE nim = ?;`,
      [nama, email, no_telepon, nim]
    );
    return result.affectedRows > 0;
  }

  static async delete(nim) {
    const [result] = await db.query('DELETE FROM peminjam WHERE nim = ?;', [nim]);
    return result.affectedRows > 0;
  }

  static async hasLoans(nim) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total_loans 
       FROM peminjaman 
       WHERE nim = ?;`,
      [nim]
    );
    return rows[0].total_loans > 0;
  }
}

module.exports = PeminjamModel;
