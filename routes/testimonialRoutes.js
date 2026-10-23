const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
const { requirePermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Testimonials'];

// The website lists testimonials without a login: only published ones (publicRead). Everything else needs a login.
router.get('/', publicRead(MODULE, 'published'), testimonialController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), testimonialController.getById);
router.post('/', ...requirePermission('create', MODULE), testimonialController.create);
router.put('/:id', ...requirePermission('update', MODULE), testimonialController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), testimonialController.delete);

module.exports = router;
