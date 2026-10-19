const express = require('express');
const router = express.Router();
const BlogCategoryController = require('../controllers/BlogCategoryController');

router.get('/', BlogCategoryController.getAll);
router.get('/:id', BlogCategoryController.getById);
router.post('/', BlogCategoryController.create);
router.put('/:id', BlogCategoryController.update);
router.delete('/:id', BlogCategoryController.delete);

module.exports = router;