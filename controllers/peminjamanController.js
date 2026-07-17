const PeminjamanModel = require("../models/peminjamanModel");
const PeminjamModel = require("../models/peminjamModel");

class PeminjamanController {
    static async getAll(req, res) {
        try {
            const loans = await PeminjamanModel.getAllLoans();
            return res.status(200).json(loans);
        } catch (error) {
            console.error("Error fetching loans:", error);
            return res
                .status(500)
                .json({ message: "Gagal mengambil data peminjaman." });
        }
    }

    static async create(req, res) {
        try {
            const { nim, tanggal_pengembalian, id_buku_list } = req.body;

            // Basic validation
            if (
                !nim ||
                !tanggal_pengembalian ||
                !id_buku_list ||
                !Array.isArray(id_buku_list) ||
                id_buku_list.length === 0
            ) {
                return res.status(400).json({
                    message:
                        "NIM, batas tanggal pengembalian, dan daftar buku wajib diisi.",
                });
            }

            // Check if borrower exists
            const borrower = await PeminjamModel.getByNim(nim);
            if (!borrower) {
                return res
                    .status(400)
                    .json({ message: "NIM peminjam tidak terdaftar." });
            }

            // Check if deadline date is valid and in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(tanggal_pengembalian);
            if (isNaN(deadlineDate.getTime())) {
                return res.status(400).json({
                    message: "Format tanggal pengembalian tidak valid.",
                });
            }
            if (deadlineDate < today) {
                return res.status(400).json({
                    message:
                        "Tanggal batas pengembalian tidak boleh di masa lalu.",
                });
            }

            const id_peminjaman = await PeminjamanModel.createLoan(
                nim,
                tanggal_pengembalian,
                id_buku_list,
            );

            return res.status(201).json({
                message: "Transaksi peminjaman berhasil dicatat.",
                id_peminjaman,
            });
        } catch (error) {
            console.error("Error creating borrowing transaction:", error);
            // If it's a known error from out of stock or book not found
            if (
                error.message.includes("Stok") ||
                error.message.includes("tidak ditemukan")
            ) {
                return res.status(400).json({ message: error.message });
            }
            return res
                .status(500)
                .json({ message: "Gagal memproses transaksi peminjaman." });
        }
    }

    static async returnBook(req, res) {
        try {
            const { id } = req.params; // id refers to id_detail

            const loanDetail = await PeminjamanModel.getDetailById(id);
            if (!loanDetail) {
                return res.status(404).json({
                    message: "Data detail peminjaman tidak ditemukan.",
                });
            }

            if (loanDetail.status === "Dikembalikan") {
                return res
                    .status(400)
                    .json({ message: "Buku sudah dikembalikan." });
            }

            // Calculate late fee (denda)
            const returnDate = new Date();
            returnDate.setHours(0, 0, 0, 0);

            const deadlineDate = new Date(loanDetail.tanggal_pengembalian);
            deadlineDate.setHours(0, 0, 0, 0);

            const timeDiff = returnDate.getTime() - deadlineDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let denda = 0;
            if (daysDiff > 0) {
                denda = daysDiff * 2000;
            }

            const returnDateStr = returnDate.toISOString().split("T")[0];

            await PeminjamanModel.returnLoanItem(id, returnDateStr, denda);

            return res.status(200).json({
                message: "Buku berhasil dikembalikan.",
                denda,
                hari_terlambat: daysDiff > 0 ? daysDiff : 0,
            });
        } catch (error) {
            console.error("Error returning book:", error);
            return res
                .status(500)
                .json({ message: "Gagal memproses pengembalian buku." });
        }
    }
}

module.exports = PeminjamanController;
