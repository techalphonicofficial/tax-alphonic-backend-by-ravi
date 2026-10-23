const express = require('express');
const router = express.Router();
const PortfolioCategoryController = require('../controllers/PortfolioCategoryController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Portfolio', 'PortfolioCategories'];

router.get('/', ...requirePermission('read', MODULE), PortfolioCategoryController.getCategories);
router.get('/:id', ...requirePermission('read', MODULE), PortfolioCategoryController.getCategoryById);
router.post('/', ...requirePermission('create', MODULE), PortfolioCategoryController.createCategory);
router.put('/:id', ...requirePermission('update', MODULE), PortfolioCategoryController.updateCategory);
router.delete('/:id', ...requirePermission('delete', MODULE), PortfolioCategoryController.deleteCategory);

module.exports = router;
