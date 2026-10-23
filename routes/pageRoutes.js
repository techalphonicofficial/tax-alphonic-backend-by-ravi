const express = require('express');
const router = express.Router();
const PageController = require('../controllers/PageController');
const { createPageSchema, updatePageSchema } = require('../validators/pageValidator');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Pages'];

// Public: the website loads a published page by its slug (a journey stage's slug has a slash,
// "journey/idea", sent encoded as one segment), and the list of Journey Stage pages.
router.get('/slug/:slug', PageController.getPageBySlug);
router.get('/journey-stages', PageController.getJourneyStages);
router.get('/tools-list', PageController.getTools);

// Admin only.
router.post('/', ...requirePermission('create', MODULE), createPageSchema, PageController.createPage);
router.get('/', ...requirePermission('read', MODULE), PageController.getPages);
router.get('/:id', ...requirePermission('read', MODULE), PageController.getPageById);
router.put('/:id', ...requirePermission('update', MODULE), updatePageSchema, PageController.updatePage);
router.delete('/:id', ...requirePermission('delete', MODULE), PageController.deletePage);

module.exports = router;
