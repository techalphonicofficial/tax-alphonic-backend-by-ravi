const express = require('express');
const router = express.Router();
const BlogController = require('../controllers/BlogController');
const rateLimit = require('express-rate-limit');
const BlogPublicController = require('../controllers/BlogPublicController');
const BlogEngagementController = require('../controllers/BlogEngagementController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// The website calls these through its server, which forwards the visitor IP in X-Forwarded-For.
const visitorKey = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
const limiter = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? max : max * 25,
  keyGenerator: visitorKey,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message },
});
const likeLimiter = limiter(120, 'Too many likes, please try again later.');
const commentLimiter = limiter(8, 'Too many comments, please try again in a few minutes.');

// Website (no auth): live posts only. Must stay above "/:id".
router.get('/public', BlogPublicController.list);
router.get('/public/categories', BlogPublicController.categories);
router.get('/public/:slug', BlogPublicController.bySlug);
router.post('/public/:slug/view', BlogPublicController.view);
router.get('/public/:slug/engagement', BlogEngagementController.engagement);
router.post('/public/:slug/like', likeLimiter, BlogEngagementController.like);
router.get('/public/:slug/comments', BlogEngagementController.comments);
router.post('/public/:slug/comments', commentLimiter, BlogEngagementController.addComment);

// Everything below is the admin panel's: login + Blogs permission.
router.use(verifyToken);
router.post('/bulk-action', checkPermission('update', 'Blogs'), BlogController.bulkAction);
router.get('/trash', checkPermission('read', 'Blogs'), BlogController.getTrash);
router.post('/:id/restore', checkPermission('delete', 'Blogs'), BlogController.restore);
router.post('/:id/duplicate', checkPermission('create', 'Blogs'), BlogController.duplicate);

router.post('/', checkPermission('create', 'Blogs'), BlogController.create);
router.get('/', checkPermission('read', 'Blogs'), BlogController.getAll);
router.get('/dashboard-stats', checkPermission('read', 'Blogs'), BlogController.getDashboardStats);
router.get('/slug/:slug', checkPermission('read', 'Blogs'), BlogController.getBySlug);
router.get('/:id', checkPermission('read', 'Blogs'), BlogController.getById);
router.put('/:id', checkPermission('update', 'Blogs'), BlogController.update);
router.delete('/:id', checkPermission('delete', 'Blogs'), BlogController.delete);

module.exports = router;
