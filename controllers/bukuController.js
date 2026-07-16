const BukuModel = require('../models/bukuModel');

class BukuController {
  static async getAll(req, res) {
    try {
      const search = req.query.search || '';
      const books = await BukuModel.getAll(search);
      return res.status(200).json(books);
    } catch (error) {
      console.error('Error fetching books:', error);
      return res.status(500).json({ message: 'Gagal mengambil data buku.' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const book = await BukuModel.getById(id);
      if (!book) {
        return res.status(404).json({ message: 'Buku tidak ditemukan.' });
      }
      return res.status(200).json(book);
    } catch (error) {
      console.error('Error fetching book:', error);
      return res.status(500).json({ message: 'Gagal mengambil data buku.' });
    }
  }

  static async create(req, res) {
    try {
      const { isbn, judul, penulis, penerbit, tahun_terbit, stok } = req.body;

      // Basic validations
      if (!isbn || !judul || !penulis || !penerbit || !tahun_terbit || stok === undefined) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      if (parseInt(stok) < 0) {
        return res.status(400).json({ message: 'Stok tidak boleh negatif.' });
      }

      // Check unique ISBN
      const existingBook = await BukuModel.getByIsbn(isbn);
      if (existingBook) {
        return res.status(400).json({ message: 'ISBN sudah terdaftar.' });
      }

      const id = await BukuModel.create({
        isbn,
        judul,
        penulis,
        penerbit,
        tahun_terbit,
        stok: parseInt(stok)
      });

      return res.status(201).json({
        message: 'Buku berhasil ditambahkan.',
        id_buku: id
      });

    } catch (error) {
      console.error('Error creating book:', error);
      return res.status(500).json({ message: 'Gagal menambahkan buku.' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { isbn, judul, penulis, penerbit, tahun_terbit, stok } = req.body;

      // Basic validations
      if (!isbn || !judul || !penulis || !penerbit || !tahun_terbit || stok === undefined) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      if (parseInt(stok) < 0) {
        return res.status(400).json({ message: 'Stok tidak boleh negatif.' });
      }

      const book = await BukuModel.getById(id);
      if (!book) {
        return res.status(404).json({ message: 'Buku tidak ditemukan.' });
      }

      // Check unique ISBN for other books
      const existingBook = await BukuModel.getByIsbn(isbn);
      if (existingBook && existingBook.id_buku !== parseInt(id)) {
        return res.status(400).json({ message: 'ISBN sudah terdaftar pada buku lain.' });
      }

      await BukuModel.update(id, {
        isbn,
        judul,
        penulis,
        penerbit,
        tahun_terbit,
        stok: parseInt(stok)
      });

      return res.status(200).json({ message: 'Buku berhasil diperbarui.' });

    } catch (error) {
      console.error('Error updating book:', error);
      return res.status(500).json({ message: 'Gagal memperbarui buku.' });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const book = await BukuModel.getById(id);
      if (!book) {
        return res.status(404).json({ message: 'Buku tidak ditemukan.' });
      }

      // Check if book is currently borrowed
      const isBorrowed = await BukuModel.isCurrentlyBorrowed(id);
      if (isBorrowed) {
        return res.status(400).json({ message: 'Buku tidak boleh dihapus karena masih aktif dipinjam.' });
      }

      // Check if book has any borrowing history (foreign key protection)
      const hasHistory = await BukuModel.hasAnyLoanHistory(id);
      if (hasHistory) {
        return res.status(400).json({ message: 'Buku tidak boleh dihapus karena memiliki riwayat peminjaman.' });
      }

      await BukuModel.delete(id);
      return res.status(200).json({ message: 'Buku berhasil dihapus.' });

    } catch (error) {
      console.error('Error deleting book:', error);
      return res.status(500).json({ message: 'Gagal menghapus buku.' });
    }
  }
}

module.exports = BukuController;
