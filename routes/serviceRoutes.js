const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Define routes
// Get by slug might be public for frontend, but since this is CMS backend API, maybe not.
// Usually frontend apps hit a different public API or we allow public access.
// Let's assume all these are admin APIs because it's under `/api/v1/services`.
// Wait, getBySlug is probably for the frontend digitalPrismaApp. Let's make it public.
router.get('/slug/:slug', ServiceController.getBySlug);
router.get('/', ServiceController.getAll); // also public? The frontend might need it, or it's for the admin panel.
// Actually, I'll only protect POST, PUT, DELETE for now to avoid breaking the frontend website.
router.get('/:id', ServiceController.getById);

router.use(verifyToken);
router.post('/', checkPermission('create', 'Services'), ServiceController.create);
router.put('/:id', checkPermission('update', 'Services'), ServiceController.update);
router.delete('/:id', checkPermission('delete', 'Services'), ServiceController.delete);

module.exports = router;
