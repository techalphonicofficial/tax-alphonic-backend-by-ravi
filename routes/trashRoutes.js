const express = require('express');
const router = express.Router();
const TrashController = require('../controllers/TrashController');
const { verifyToken } = require('../middlewares/auth');

// Trash: deleted services, pages, SEO pages / configs, blogs, categories, forms and menus.
// Each action checks the permission of the module it touches (see TrashController MODULES).
router.use(verifyToken);
router.get('/summary', TrashController.summary);
router.get('/:module', TrashController.list);
router.post('/:module/restore', TrashController.restore);
router.delete('/:module', TrashController.purge);

module.exports = router;
