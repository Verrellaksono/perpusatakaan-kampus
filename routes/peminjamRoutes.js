const express = require('express');
const router = express.Router();
const PeminjamController = require('../controllers/peminjamController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all borrower endpoints with authentication
router.use(authMiddleware);

router.get('/', PeminjamController.getAll);
router.get('/:nik', PeminjamController.getByNik);
router.post('/', PeminjamController.create);
router.put('/:nik', PeminjamController.update);
router.delete('/:nik', PeminjamController.delete);

module.exports = router;
