const express = require('express');
const router = express.Router();
const SeoController = require('../controllers/SeoController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Public: the website reads the active config of the page it renders.
router.get('/lookup', SeoController.getByRoute);

// Admin (SEO Management → SEO Configs)
router.use(verifyToken);
router.get('/', checkPermission('read', 'SEO'), SeoController.getAll);
router.get('/:id', checkPermission('read', 'SEO'), SeoController.getById);
router.post('/', checkPermission('create', 'SEO'), SeoController.create);
router.put('/:id', checkPermission('update', 'SEO'), SeoController.update);
router.delete('/:id', checkPermission('delete', 'SEO'), SeoController.delete);

module.exports = router;
