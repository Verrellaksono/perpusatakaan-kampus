const PeminjamModel = require('../models/peminjamModel');

class PeminjamController {
  static async getAll(req, res) {
    try {
      const borrowers = await PeminjamModel.getAll();
      return res.status(200).json(borrowers);
    } catch (error) {
      console.error('Error fetching borrowers:', error);
      return res.status(500).json({ message: 'Gagal mengambil data peminjam.' });
    }
  }

  static async getByNim(req, res) {
    try {
      const { nim } = req.params;
      const borrower = await PeminjamModel.getByNim(nim);
      if (!borrower) {
        return res.status(404).json({ message: 'Peminjam tidak ditemukan.' });
      }
      return res.status(200).json(borrower);
    } catch (error) {
      console.error('Error fetching borrower:', error);
      return res.status(500).json({ message: 'Gagal mengambil data peminjam.' });
    }
  }

  static async create(req, res) {
    try {
      const { nim, nama, email, no_telepon } = req.body;

      // Basic validations
      if (!nim || !nama || !email || !no_telepon) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      // Check unique NIM
      const existingNim = await PeminjamModel.getByNim(nim);
      if (existingNim) {
        return res.status(400).json({ message: 'Peminjam dengan NIM tersebut sudah terdaftar.' });
      }

      // Check unique Email
      const existingEmail = await PeminjamModel.getByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email sudah digunakan.' });
      }

      await PeminjamModel.create({ nim, nama, email, no_telepon });

      return res.status(201).json({ message: 'Peminjam berhasil ditambahkan.' });

    } catch (error) {
      console.error('Error creating borrower:', error);
      return res.status(500).json({ message: 'Gagal menambahkan peminjam.' });
    }
  }

  static async update(req, res) {
    try {
      const { nim } = req.params;
      const { nama, email, no_telepon } = req.body;

      // Basic validations
      if (!nama || !email || !no_telepon) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      const borrower = await PeminjamModel.getByNim(nim);
      if (!borrower) {
        return res.status(404).json({ message: 'Peminjam tidak ditemukan.' });
      }

      // Check unique Email for other borrowers
      const existingEmail = await PeminjamModel.getByEmail(email);
      if (existingEmail && existingEmail.nim !== nim) {
        return res.status(400).json({ message: 'Email sudah digunakan oleh peminjam lain.' });
      }

      await PeminjamModel.update(nim, { nama, email, no_telepon });

      return res.status(200).json({ message: 'Data peminjam berhasil diperbarui.' });

    } catch (error) {
      console.error('Error updating borrower:', error);
      return res.status(500).json({ message: 'Gagal memperbarui data peminjam.' });
    }
  }

  static async delete(req, res) {
    try {
      const { nim } = req.params;

      const borrower = await PeminjamModel.getByNim(nim);
      if (!borrower) {
        return res.status(404).json({ message: 'Peminjam tidak ditemukan.' });
      }

      // Check if borrower has borrowing history
      const hasLoans = await PeminjamModel.hasLoans(nim);
      if (hasLoans) {
        return res.status(400).json({ message: 'Peminjam tidak boleh dihapus karena memiliki riwayat peminjaman.' });
      }

      await PeminjamModel.delete(nim);
      return res.status(200).json({ message: 'Peminjam berhasil dihapus.' });

    } catch (error) {
      console.error('Error deleting borrower:', error);
      return res.status(500).json({ message: 'Gagal menghapus peminjam.' });
    }
  }
}

module.exports = PeminjamController;
