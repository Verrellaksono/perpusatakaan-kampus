-- DDL Script untuk Sistem Informasi Perpustakaan Kampus
-- Berdasarkan rancangan ERD yang telah disesuaikan

CREATE DATABASE IF NOT EXISTS perpustakaan_kampus;
USE perpustakaan_kampus;

-- 1. Tabel Buku
CREATE TABLE IF NOT EXISTS buku (
    id_buku INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    judul VARCHAR(255) NOT NULL,
    penulis VARCHAR(150) NOT NULL,
    penerbit VARCHAR(150) NOT NULL,
    tahun_terbit YEAR NOT NULL,
    stok INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- 2. Tabel Peminjam
CREATE TABLE IF NOT EXISTS peminjam (
    nik VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    no_telepon VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

-- 3. Tabel Peminjaman (Transaksi Utama)
CREATE TABLE IF NOT EXISTS peminjaman (
    id_peminjaman INT AUTO_INCREMENT PRIMARY KEY,
    nik VARCHAR(20) NOT NULL,
    tanggal_peminjaman DATE NOT NULL,
    tanggal_pengembalian DATE NOT NULL, -- Batas waktu harus kembali
    FOREIGN KEY (nik) REFERENCES peminjam(nik) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Tabel Detail Peminjaman (Junction Table)
CREATE TABLE IF NOT EXISTS detail_peminjaman (
    id_detail INT AUTO_INCREMENT PRIMARY KEY,
    id_peminjaman INT NOT NULL,
    id_buku INT NOT NULL,
    tanggal_realisasi_kembali DATE NULL, -- Diisi saat buku asli dikembalikan
    denda DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('Dipinjam', 'Dikembalikan') NOT NULL DEFAULT 'Dipinjam',
    FOREIGN KEY (id_peminjaman) REFERENCES peminjaman(id_peminjaman) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_buku) REFERENCES buku(id_buku) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Membuat index untuk mempercepat fitur pencarian buku berdasarkan judul
CREATE INDEX idx_buku_judul ON buku(judul);
