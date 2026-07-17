const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "perpustakaan",
    port: process.env.DB_PORT || 3306,
};

let pool;

async function initializeDatabase() {
    try {
        // Connect to MySQL server without database first to ensure the database exists
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
        });

        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`,
        );
        await connection.end();

        // Create the pool with the database specified
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        console.log("Database connection pool established successfully.");

        // Initialize tables
        await createTables();
    } catch (error) {
        console.error("Failed to initialize database:", error);
        process.exit(1);
    }
}

async function createTables() {
    const tables = [
        // 1. Table: buku
        `CREATE TABLE IF NOT EXISTS buku (
      id_buku INT AUTO_INCREMENT PRIMARY KEY,
      isbn VARCHAR(20) UNIQUE NOT NULL,
      judul VARCHAR(255) NOT NULL,
      penulis VARCHAR(150) NOT NULL,
      penerbit VARCHAR(150) NOT NULL,
      tahun_terbit YEAR NOT NULL,
      stok INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB;`,

        // 2. Table: peminjam
        `CREATE TABLE IF NOT EXISTS peminjam (
      nim VARCHAR(20) PRIMARY KEY,
      nama VARCHAR(150) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      no_telepon VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB;`,

        // 3. Table: peminjaman
        `CREATE TABLE IF NOT EXISTS peminjaman (
      id_peminjaman INT AUTO_INCREMENT PRIMARY KEY,
      nim VARCHAR(20) NOT NULL,
      tanggal_peminjaman DATE NOT NULL,
      tanggal_pengembalian DATE NOT NULL,
      FOREIGN KEY (nim) REFERENCES peminjam(nim) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;`,

        // 4. Table: detail_peminjaman
        `CREATE TABLE IF NOT EXISTS detail_peminjaman (
      id_detail INT AUTO_INCREMENT PRIMARY KEY,
      id_peminjaman INT NOT NULL,
      id_buku INT NOT NULL,
      tanggal_realisasi_kembali DATE NULL,
      denda DECIMAL(10, 2) DEFAULT 0.00,
      status ENUM('Dipinjam', 'Dikembalikan') NOT NULL DEFAULT 'Dipinjam',
      FOREIGN KEY (id_peminjaman) REFERENCES peminjaman(id_peminjaman) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (id_buku) REFERENCES buku(id_buku) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;`,

        // 5. Table: users
        `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'admin'
    ) ENGINE=InnoDB;`,
    ];

    for (const query of tables) {
        await pool.query(query);
    }

    // Search
    try {
        const [indexes] = await pool.query(
            `SHOW INDEX FROM buku WHERE Key_name = 'idx_buku_judul';`,
        );
        if (indexes.length === 0) {
            await pool.query(`CREATE INDEX idx_buku_judul ON buku(judul);`);
            console.log("Index idx_buku_judul created.");
        }
    } catch (err) {
        // If table just created, index creation might complain, but this is safe
        console.warn("Index checks completed or warning: ", err.message);
    }

    // Default Admin
    const [users] = await pool.query("SELECT * FROM users LIMIT 1;");
    if (users.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);
        await pool.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?);`,
            ["admin", hashedPassword, "admin"],
        );
        console.log("Default admin user created: admin / admin123");
    }
}

// Initialize database right away
const dbInitPromise = initializeDatabase();

module.exports = {
    // Expose a query helper that waits for database initialization
    query: async (sql, params) => {
        await dbInitPromise;
        return pool.query(sql, params);
    },
    // Expose a transaction helper
    getConnection: async () => {
        await dbInitPromise;
        return pool.getConnection();
    },
    pool: {
        // To allow external tools or scripts to wait for initialization
        wait: () => dbInitPromise,
    },
};
