const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const NewsletterController = require('../controllers/NewsletterController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Newsletter sign-ups. Public: POST /subscribe (website Newsletter block, through the website
// server). Admin (Newsletter or CRM permission): list, CSV export, status, delete.
const visitorKey = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 6 : 150,
  keyGenerator: visitorKey,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again in a few minutes.', data: null, errors: [] },
});

router.post('/subscribe', subscribeLimiter, NewsletterController.subscribe);

router.use(verifyToken);
const MODULES = ['Newsletter', 'CRM'];
router.get('/', checkPermission('read', MODULES), NewsletterController.list);
router.get('/export', checkPermission('read', MODULES), NewsletterController.exportCsv);
router.patch('/:id', checkPermission('update', MODULES), NewsletterController.setStatus);
router.delete('/:id', checkPermission('delete', MODULES), NewsletterController.remove);

module.exports = router;
