const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/LocationController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'Locations'];

router.get('/', ...requirePermission('read', MODULE), LocationController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), LocationController.getById);
router.post('/', ...requirePermission('create', MODULE), LocationController.create);
router.put('/:id', ...requirePermission('update', MODULE), LocationController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), LocationController.delete);

module.exports = router;
