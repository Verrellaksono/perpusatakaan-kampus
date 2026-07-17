const express = require('express');
const router = express.Router();
const PeminjamController = require('../controllers/peminjamController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all borrower endpoints with authentication
router.use(authMiddleware);

router.get('/', PeminjamController.getAll);
router.get('/:nim', PeminjamController.getByNim);
router.post('/', PeminjamController.create);
router.put('/:nim', PeminjamController.update);
router.delete('/:nim', PeminjamController.delete);

module.exports = router;
