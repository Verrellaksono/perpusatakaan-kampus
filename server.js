const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const authRoutes = require("./routes/authRoutes");
const bukuRoutes = require("./routes/bukuRoutes");
const peminjamRoutes = require("./routes/peminjamRoutes");
const peminjamanRoutes = require("./routes/peminjamanRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// Serve local flowbite vendor files
app.use(
    "/vendor/flowbite",
    express.static(path.join(__dirname, "node_modules/flowbite/dist")),
);

// Routes
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/dashboard.html"));
});

app.get("/buku", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/buku.html"));
});

app.get("/peminjam", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/peminjam.html"));
});

app.get("/peminjaman", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/peminjaman.html"));
});

app.get("/pengembalian", (req, res) => {
    res.sendFile(path.join(__dirname, "public/pages/pengembalian.html"));
});

// Root route redirect to login
app.get("/", (req, res) => {
    res.redirect("/login");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/buku", bukuRoutes);
app.use("/api/peminjam", peminjamRoutes);
app.use("/api/peminjaman", peminjamanRoutes);

// Page fallback: return 404 for APIs, redirect to login for undefined web pages
app.use("/api/*", (req, res) => {
    res.status(404).json({ message: "API Endpoint tidak ditemukan." });
});

app.use((req, res) => {
    res.status(404).redirect("/login");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Terjadi kesalahan internal server." });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(
        `Database yang digunakan: ${process.env.DB_NAME || "perpustakaan"}`,
    );
});
