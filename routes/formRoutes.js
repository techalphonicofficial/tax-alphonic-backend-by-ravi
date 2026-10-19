const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const FormController = require('../controllers/FormController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Public submissions get a tighter per-IP limit than the global API limiter
const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many submissions from this IP, please try again after 15 minutes.' }
});

// Public routes (website)
router.get('/public/:identifier', FormController.getPublic);
router.post('/public/:identifier/submit', submitLimiter, FormController.submit);

// Admin routes
router.use(verifyToken);
router.get('/', checkPermission('read', 'Forms'), FormController.getAll);
router.get('/:id', checkPermission('read', 'Forms'), FormController.getById);
router.post('/', checkPermission('create', 'Forms'), FormController.create);
router.post('/:id/duplicate', checkPermission('create', 'Forms'), FormController.duplicate);
router.put('/:id', checkPermission('update', 'Forms'), FormController.update);
router.delete('/:id', checkPermission('delete', 'Forms'), FormController.delete);

module.exports = router;
