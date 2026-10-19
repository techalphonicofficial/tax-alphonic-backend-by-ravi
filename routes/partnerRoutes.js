const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/PartnerController');
const { verifyToken, checkPermission } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public read endpoints for website
router.get('/', PartnerController.getAll);
router.get('/:id', PartnerController.getById);

// Protected admin mutation endpoints
router.use(verifyToken);
router.post('/', checkPermission('create', 'Partners'), upload.single('logo'), PartnerController.create);
router.put('/:id', checkPermission('update', 'Partners'), upload.single('logo'), PartnerController.update);
router.delete('/:id', checkPermission('delete', 'Partners'), PartnerController.delete);

module.exports = router;
