const express = require('express');
const router = express.Router();
const BlogCategoryController = require('../controllers/BlogCategoryController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Blogs', 'BlogCategories'];

router.get('/', ...requirePermission('read', MODULE), BlogCategoryController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), BlogCategoryController.getById);
router.post('/', ...requirePermission('create', MODULE), BlogCategoryController.create);
router.put('/:id', ...requirePermission('update', MODULE), BlogCategoryController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), BlogCategoryController.delete);

module.exports = router;
