const express = require('express');
const router = express.Router();
const ServiceCategoryController = require('../controllers/ServiceCategoryController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Services', 'ServiceCategories'];

router.get('/', ...requirePermission('read', MODULE), ServiceCategoryController.getCategories);
// Public: the website shows a service's category (name) on its page.
router.get('/:id', ServiceCategoryController.getCategoryById);
router.post('/', ...requirePermission('create', MODULE), ServiceCategoryController.createCategory);
router.put('/:id', ...requirePermission('update', MODULE), ServiceCategoryController.updateCategory);
router.delete('/:id', ...requirePermission('delete', MODULE), ServiceCategoryController.deleteCategory);

module.exports = router;
