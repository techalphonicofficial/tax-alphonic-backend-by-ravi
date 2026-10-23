const express = require('express');
const router = express.Router();
const StateController = require('../controllers/StateController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'States'];

router.get('/', ...requirePermission('read', MODULE), StateController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), StateController.getById);
router.post('/', ...requirePermission('create', MODULE), StateController.create);
router.put('/:id', ...requirePermission('update', MODULE), StateController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), StateController.delete);

module.exports = router;
