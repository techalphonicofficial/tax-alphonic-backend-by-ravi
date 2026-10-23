const express = require('express');
const router = express.Router();
const CountryController = require('../controllers/CountryController');
const { verifyToken, checkPermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Countries'];
const upload = require('../middlewares/upload');

// The website lists them without a login: only active ones (publicRead).
router.get('/', publicRead(MODULE, 'active'), CountryController.getAll);

// Everything else needs a login.
router.use(verifyToken);
router.get('/:id', checkPermission('read', MODULE), CountryController.getById);

router.post('/', checkPermission('create', MODULE), upload.single('flag'), CountryController.create);
router.put('/:id', checkPermission('update', MODULE), upload.single('flag'), CountryController.update);
router.delete('/:id', checkPermission('delete', MODULE), CountryController.delete);

module.exports = router;
