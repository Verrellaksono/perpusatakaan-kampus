const db = require('./db');

class PeminjamModel {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM peminjam ORDER BY nama ASC;');
    return rows;
  }

  static async getByNik(nik) {
    const [rows] = await db.query('SELECT * FROM peminjam WHERE nik = ?;', [nik]);
    return rows[0];
  }

  static async getByEmail(email) {
    const [rows] = await db.query('SELECT * FROM peminjam WHERE email = ?;', [email]);
    return rows[0];
  }

  static async create(peminjam) {
    const { nik, nama, email, no_telepon } = peminjam;
    const [result] = await db.query(
      `INSERT INTO peminjam (nik, nama, email, no_telepon) 
       VALUES (?, ?, ?, ?);`,
      [nik, nama, email, no_telepon]
    );
    return result.affectedRows > 0;
  }

  static async update(nik, peminjam) {
    const { nama, email, no_telepon } = peminjam;
    const [result] = await db.query(
      `UPDATE peminjam 
       SET nama = ?, email = ?, no_telepon = ? 
       WHERE nik = ?;`,
      [nama, email, no_telepon, nik]
    );
    return result.affectedRows > 0;
  }

  static async delete(nik) {
    const [result] = await db.query('DELETE FROM peminjam WHERE nik = ?;', [nik]);
    return result.affectedRows > 0;
  }

  static async hasLoans(nik) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total_loans 
       FROM peminjaman 
       WHERE nik = ?;`,
      [nik]
    );
    return rows[0].total_loans > 0;
  }
}

module.exports = PeminjamModel;
