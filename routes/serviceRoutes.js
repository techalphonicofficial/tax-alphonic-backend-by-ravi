const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Public: the website loads a service page by its slug.
router.get('/slug/:slug', ServiceController.getBySlug);

// Admin only.
router.use(verifyToken);
router.get('/', checkPermission('read', 'Services'), ServiceController.getAll);
router.get('/:id', checkPermission('read', 'Services'), ServiceController.getById);
router.post('/', checkPermission('create', 'Services'), ServiceController.create);
// Draft copy of a service with its blocks (admin "Clone").
router.post('/:id/clone', checkPermission('create', 'Services'), ServiceController.clone);
router.put('/:id', checkPermission('update', 'Services'), ServiceController.update);
router.delete('/:id', checkPermission('delete', 'Services'), ServiceController.delete);

module.exports = router;
