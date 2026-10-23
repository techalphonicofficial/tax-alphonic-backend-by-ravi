const express = require('express');
const router = express.Router();
const BlogAuthorController = require('../controllers/BlogAuthorController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Blogs', 'BlogAuthors'];

router.get('/', ...requirePermission('read', MODULE), BlogAuthorController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), BlogAuthorController.getById);
router.post('/', ...requirePermission('create', MODULE), BlogAuthorController.create);
router.put('/:id', ...requirePermission('update', MODULE), BlogAuthorController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), BlogAuthorController.delete);

module.exports = router;
