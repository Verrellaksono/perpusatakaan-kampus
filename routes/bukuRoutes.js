const express = require('express');
const router = express.Router();
const BukuController = require('../controllers/bukuController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all book endpoints with authentication
router.use(authMiddleware);

router.get('/', BukuController.getAll);
router.get('/:id', BukuController.getById);
router.post('/', BukuController.create);
router.put('/:id', BukuController.update);
router.delete('/:id', BukuController.delete);

module.exports = router;
