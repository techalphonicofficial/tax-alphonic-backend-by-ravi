const express = require('express');
const router = express.Router();
const FaqController = require('../controllers/FaqController');
const { requirePermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'FAQs'];

// The website lists FAQs without a login: only published ones (publicRead). Everything else needs a login.
router.get('/', publicRead(MODULE, 'published'), FaqController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), FaqController.getById);
router.post('/', ...requirePermission('create', MODULE), FaqController.create);
router.put('/:id', ...requirePermission('update', MODULE), FaqController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), FaqController.delete);

module.exports = router;
