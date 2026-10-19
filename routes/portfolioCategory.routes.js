const express = require('express');
const router = express.Router();
const PortfolioCategoryController = require('../controllers/PortfolioCategoryController');


router.post('/', PortfolioCategoryController.createCategory);
router.get('/', PortfolioCategoryController.getCategories);
router.get('/:id', PortfolioCategoryController.getCategoryById);
router.put('/:id', PortfolioCategoryController.updateCategory);
router.delete('/:id', PortfolioCategoryController.deleteCategory);

module.exports = router;
