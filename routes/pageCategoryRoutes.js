const express = require('express');
const router = express.Router();
const PageCategoryController = require('../controllers/PageCategoryController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', PageCategoryController.getAll);
router.get('/:id', PageCategoryController.getById);
router.post('/', checkPermission('create', 'PageCategories'), PageCategoryController.create);
router.put('/:id', checkPermission('update', 'PageCategories'), PageCategoryController.update);
router.delete('/:id', checkPermission('delete', 'PageCategories'), PageCategoryController.delete);

module.exports = router;
