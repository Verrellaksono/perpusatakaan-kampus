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

  static async getByNik(req, res) {
    try {
      const { nik } = req.params;
      const borrower = await PeminjamModel.getByNik(nik);
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
      const { nik, nama, email, no_telepon } = req.body;

      // Basic validations
      if (!nik || !nama || !email || !no_telepon) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      // Check unique NIK
      const existingNik = await PeminjamModel.getByNik(nik);
      if (existingNik) {
        return res.status(400).json({ message: 'Peminjam dengan NIK tersebut sudah terdaftar.' });
      }

      // Check unique Email
      const existingEmail = await PeminjamModel.getByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email sudah digunakan.' });
      }

      await PeminjamModel.create({ nik, nama, email, no_telepon });

      return res.status(201).json({ message: 'Peminjam berhasil ditambahkan.' });

    } catch (error) {
      console.error('Error creating borrower:', error);
      return res.status(500).json({ message: 'Gagal menambahkan peminjam.' });
    }
  }

  static async update(req, res) {
    try {
      const { nik } = req.params;
      const { nama, email, no_telepon } = req.body;

      // Basic validations
      if (!nama || !email || !no_telepon) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      const borrower = await PeminjamModel.getByNik(nik);
      if (!borrower) {
        return res.status(404).json({ message: 'Peminjam tidak ditemukan.' });
      }

      // Check unique Email for other borrowers
      const existingEmail = await PeminjamModel.getByEmail(email);
      if (existingEmail && existingEmail.nik !== nik) {
        return res.status(400).json({ message: 'Email sudah digunakan oleh peminjam lain.' });
      }

      await PeminjamModel.update(nik, { nama, email, no_telepon });

      return res.status(200).json({ message: 'Data peminjam berhasil diperbarui.' });

    } catch (error) {
      console.error('Error updating borrower:', error);
      return res.status(500).json({ message: 'Gagal memperbarui data peminjam.' });
    }
  }

  static async delete(req, res) {
    try {
      const { nik } = req.params;

      const borrower = await PeminjamModel.getByNik(nik);
      if (!borrower) {
        return res.status(404).json({ message: 'Peminjam tidak ditemukan.' });
      }

      // Check if borrower has borrowing history
      const hasLoans = await PeminjamModel.hasLoans(nik);
      if (hasLoans) {
        return res.status(400).json({ message: 'Peminjam tidak boleh dihapus karena memiliki riwayat peminjaman.' });
      }

      await PeminjamModel.delete(nik);
      return res.status(200).json({ message: 'Peminjam berhasil dihapus.' });

    } catch (error) {
      console.error('Error deleting borrower:', error);
      return res.status(500).json({ message: 'Gagal menghapus peminjam.' });
    }
  }
}

module.exports = PeminjamController;
