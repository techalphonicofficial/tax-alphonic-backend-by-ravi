const express = require('express');
const router = express.Router();
const ServiceCategoryController = require('../controllers/ServiceCategoryController');

router.post('/', ServiceCategoryController.createCategory);
router.get('/', ServiceCategoryController.getCategories);
router.get('/:id', ServiceCategoryController.getCategoryById);
router.put('/:id', ServiceCategoryController.updateCategory);
router.delete('/:id', ServiceCategoryController.deleteCategory);

module.exports = router;
