const express = require('express');
const router = express.Router();
const PageController = require('../controllers/PageController');
const { createPageSchema, updatePageSchema } = require('../validators/pageValidator');

// Public route
router.get('/slug/:slug', PageController.getPageBySlug);

// Admin routes (Assume AuthMiddleware will be added later)
router.post('/', createPageSchema, PageController.createPage);
router.get('/', PageController.getPages);
router.get('/:id', PageController.getPageById);
router.put('/:id', updatePageSchema, PageController.updatePage);
router.delete('/:id', PageController.deletePage);

module.exports = router;
