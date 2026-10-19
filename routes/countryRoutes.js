const express = require('express');
const router = express.Router();
const CountryController = require('../controllers/CountryController');
const { verifyToken, checkPermission } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public read endpoints for website
router.get('/', CountryController.getAll);
router.get('/:id', CountryController.getById);

// Protected admin mutation endpoints
router.use(verifyToken);
router.post('/', checkPermission('create', 'Countries'), upload.single('flag'), CountryController.create);
router.put('/:id', checkPermission('update', 'Countries'), upload.single('flag'), CountryController.update);
router.delete('/:id', checkPermission('delete', 'Countries'), CountryController.delete);

module.exports = router;
