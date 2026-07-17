const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res
            .status(401)
            .json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Format token tidak valid." });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "perpustakaan_kampus_secret_key_2026",
        );
        req.user = decoded;
        next();
    } catch (error) {
        return res
            .status(403)
            .json({ message: "Token tidak valid atau kedaluwarsa." });
    }
};

module.exports = authMiddleware;
