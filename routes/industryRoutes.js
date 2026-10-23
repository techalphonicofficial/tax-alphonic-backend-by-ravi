const express = require('express');
const router = express.Router();
const IndustryController = require('../controllers/IndustryController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'Industries'];

router.get('/', ...requirePermission('read', MODULE), IndustryController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), IndustryController.getById);
router.post('/', ...requirePermission('create', MODULE), IndustryController.create);
router.put('/:id', ...requirePermission('update', MODULE), IndustryController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), IndustryController.delete);

module.exports = router;
