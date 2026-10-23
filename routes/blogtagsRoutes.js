const express = require('express');
const router = express.Router();
const BlogTagController = require('../controllers/BlogTagController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Blogs', 'BlogTags'];

router.get('/', ...requirePermission('read', MODULE), BlogTagController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), BlogTagController.getById);
router.post('/', ...requirePermission('create', MODULE), BlogTagController.create);
router.put('/:id', ...requirePermission('update', MODULE), BlogTagController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), BlogTagController.delete);

module.exports = router;
