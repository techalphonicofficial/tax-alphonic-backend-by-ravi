const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/PartnerController');
const { verifyToken, checkPermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Partners'];
const upload = require('../middlewares/upload');

// The website lists them without a login: only active ones (publicRead).
router.get('/', publicRead(MODULE, 'active'), PartnerController.getAll);

// Everything else needs a login.
router.use(verifyToken);
router.get('/:id', checkPermission('read', MODULE), PartnerController.getById);

router.post('/', checkPermission('create', MODULE), upload.single('logo'), PartnerController.create);
router.put('/:id', checkPermission('update', MODULE), upload.single('logo'), PartnerController.update);
router.delete('/:id', checkPermission('delete', MODULE), PartnerController.delete);

module.exports = router;
