const express = require('express');
const router = express.Router();
const PeminjamanController = require('../controllers/peminjamanController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all loan/return endpoints with authentication
router.use(authMiddleware);

router.get('/', PeminjamanController.getAll);
router.post('/', PeminjamanController.create);
router.put('/pengembalian/:id', PeminjamanController.returnBook);

module.exports = router;
