const express = require('express');
const router = express.Router();
const BlogEngagementController = require('../controllers/BlogEngagementController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Admin moderation of website blog comments (the public feed lives under /blogs/public/:slug/comments).
router.use(verifyToken);
router.get('/', checkPermission('read', 'Blogs'), BlogEngagementController.adminList);
router.patch('/:id', checkPermission('update', 'Blogs'), BlogEngagementController.adminSetStatus);
router.delete('/:id', checkPermission('delete', 'Blogs'), BlogEngagementController.adminDelete);

module.exports = router;
