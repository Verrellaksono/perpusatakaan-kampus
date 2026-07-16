const db = require('./db');

class BukuModel {
  static async getAll(search = '') {
    if (search.trim()) {
      const [rows] = await db.query(
        'SELECT * FROM buku WHERE judul LIKE ? ORDER BY id_buku DESC;',
        [`%${search}%`]
      );
      return rows;
    }
    const [rows] = await db.query('SELECT * FROM buku ORDER BY id_buku DESC;');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM buku WHERE id_buku = ?;', [id]);
    return rows[0];
  }

  static async getByIsbn(isbn) {
    const [rows] = await db.query('SELECT * FROM buku WHERE isbn = ?;', [isbn]);
    return rows[0];
  }

  static async create(buku) {
    const { isbn, judul, penulis, penerbit, tahun_terbit, stok } = buku;
    const [result] = await db.query(
      `INSERT INTO buku (isbn, judul, penulis, penerbit, tahun_terbit, stok) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      [isbn, judul, penulis, penerbit, tahun_terbit, stok]
    );
    return result.insertId;
  }

  static async update(id, buku) {
    const { isbn, judul, penulis, penerbit, tahun_terbit, stok } = buku;
    const [result] = await db.query(
      `UPDATE buku 
       SET isbn = ?, judul = ?, penulis = ?, penerbit = ?, tahun_terbit = ?, stok = ? 
       WHERE id_buku = ?;`,
      [isbn, judul, penulis, penerbit, tahun_terbit, stok, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM buku WHERE id_buku = ?;', [id]);
    return result.affectedRows > 0;
  }

  static async isCurrentlyBorrowed(id) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS active_loans 
       FROM detail_peminjaman 
       WHERE id_buku = ? AND status = 'Dipinjam';`,
      [id]
    );
    return rows[0].active_loans > 0;
  }

  static async hasAnyLoanHistory(id) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total FROM detail_peminjaman WHERE id_buku = ?;`,
      [id]
    );
    return rows[0].total > 0;
  }
}

module.exports = BukuModel;
