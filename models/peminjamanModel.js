const db = require('./db');

class PeminjamanModel {
  static async getAllLoans() {
    const query = `
      SELECT 
        dp.id_detail,
        dp.id_peminjaman,
        p.nim,
        p.nama AS nama_peminjam,
        b.id_buku,
        b.judul AS judul_buku,
        b.isbn,
        pj.tanggal_peminjaman,
        pj.tanggal_pengembalian,
        dp.tanggal_realisasi_kembali,
        dp.denda,
        dp.status
      FROM detail_peminjaman dp
      JOIN peminjaman pj ON dp.id_peminjaman = pj.id_peminjaman
      JOIN peminjam p ON pj.nim = p.nim
      JOIN buku b ON dp.id_buku = b.id_buku
      ORDER BY pj.id_peminjaman DESC, dp.id_detail DESC;
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  static async getDetailById(id_detail) {
    const query = `
      SELECT 
        dp.id_detail,
        dp.id_peminjaman,
        pj.nim,
        b.id_buku,
        b.judul AS judul_buku,
        pj.tanggal_peminjaman,
        pj.tanggal_pengembalian,
        dp.tanggal_realisasi_kembali,
        dp.denda,
        dp.status
      FROM detail_peminjaman dp
      JOIN peminjaman pj ON dp.id_peminjaman = pj.id_peminjaman
      JOIN buku b ON dp.id_buku = b.id_buku
      WHERE dp.id_detail = ?;
    `;
    const [rows] = await db.query(query, [id_detail]);
    return rows[0];
  }

  // Create a borrowing transaction
  static async createLoan(nim, tanggal_pengembalian, id_buku_list) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert into peminjaman
      const tanggal_peminjaman = new Date().toISOString().split('T')[0];
      const [pjResult] = await conn.query(
        `INSERT INTO peminjaman (nim, tanggal_peminjaman, tanggal_pengembalian) 
         VALUES (?, ?, ?);`,
        [nim, tanggal_peminjaman, tanggal_pengembalian]
      );
      const id_peminjaman = pjResult.insertId;

      // 2. Insert details & update book stocks
      for (const id_buku of id_buku_list) {
        // Check book stock
        const [bookRows] = await conn.query(
          'SELECT stok, judul FROM buku WHERE id_buku = ? FOR UPDATE;', 
          [id_buku]
        );
        
        if (bookRows.length === 0) {
          throw new Error(`Buku dengan ID ${id_buku} tidak ditemukan.`);
        }

        const book = bookRows[0];
        if (book.stok <= 0) {
          throw new Error(`Stok buku "${book.judul}" habis.`);
        }

        // Insert loan detail
        await conn.query(
          `INSERT INTO detail_peminjaman (id_peminjaman, id_buku, status) 
           VALUES (?, ?, 'Dipinjam');`,
          [id_peminjaman, id_buku]
        );

        // Deduct book stock by 1
        await conn.query(
          `UPDATE buku SET stok = stok - 1 WHERE id_buku = ?;`,
          [id_buku]
        );
      }

      await conn.commit();
      return id_peminjaman;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Return a book transaction
  static async returnLoanItem(id_detail, tanggal_realisasi_kembali, denda) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Get detail record to find the associated book ID
      const [detailRows] = await conn.query(
        'SELECT id_buku, status FROM detail_peminjaman WHERE id_detail = ? FOR UPDATE;',
        [id_detail]
      );

      if (detailRows.length === 0) {
        throw new Error('Detail peminjaman tidak ditemukan.');
      }

      const detail = detailRows[0];
      if (detail.status === 'Dikembalikan') {
        throw new Error('Buku ini sudah dikembalikan sebelumnya.');
      }

      // Update detail status and record denda
      await conn.query(
        `UPDATE detail_peminjaman 
         SET status = 'Dikembalikan', tanggal_realisasi_kembali = ?, denda = ? 
         WHERE id_detail = ?;`,
        [tanggal_realisasi_kembali, denda, id_detail]
      );

      // Increment book stock by 1
      await conn.query(
        `UPDATE buku SET stok = stok + 1 WHERE id_buku = ?;`,
        [detail.id_buku]
      );

      await conn.commit();
      return true;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = PeminjamanModel;
