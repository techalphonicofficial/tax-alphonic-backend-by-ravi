const express = require('express');
const router = express.Router();
const TechnologyController = require('../controllers/TechnologyController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'Technologies'];

router.get('/', ...requirePermission('read', MODULE), TechnologyController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), TechnologyController.getById);
router.post('/', ...requirePermission('create', MODULE), TechnologyController.create);
router.put('/:id', ...requirePermission('update', MODULE), TechnologyController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), TechnologyController.delete);

module.exports = router;
