const express = require('express');
const router = express.Router();
const SeoPageController = require('../controllers/SeoPageController');
const AiSettingsController = require('../controllers/AiSettingsController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'SEOPages'];

// AI: these spend the provider API key, so they require an admin login
router.get('/ai-settings', verifyToken, checkPermission('read', 'SEO'), AiSettingsController.get);
router.put('/ai-settings', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.update);
router.post('/ai-settings/models', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.listModels);
router.post('/ai-settings/test', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.test);
router.get('/ai-config', verifyToken, checkPermission('read', 'SEO'), SeoPageController.getAiConfig);
router.post('/bulk-generate-ai', verifyToken, checkPermission('update', 'SEO'), SeoPageController.triggerBulkGenai);
router.post('/generate-ai/:id', verifyToken, checkPermission('update', 'SEO'), SeoPageController.triggerGenai);

// Public: the website looks a page up by its path and lists a service's location pages.
router.get('/lookup', SeoPageController.getBySlug);
router.get('/by-service/:identifier', SeoPageController.getByService);

router.post('/', verifyToken, checkPermission('create', MODULE), SeoPageController.create);
router.post('/bulk-generate', verifyToken, checkPermission('create', MODULE), SeoPageController.bulkGenerate);
router.get('/combos', verifyToken, checkPermission('read', MODULE), SeoPageController.getCombos);
router.get('/admin-list', verifyToken, checkPermission('read', 'SEO'), SeoPageController.adminList);
router.post('/bulk-status', verifyToken, checkPermission('update', 'SEO'), SeoPageController.bulkStatus);
router.get('/related', verifyToken, checkPermission('read', MODULE), SeoPageController.getRelated);
router.get('/', verifyToken, checkPermission('read', MODULE), SeoPageController.getAll);
router.get('/:id', verifyToken, checkPermission('read', MODULE), SeoPageController.getById);
router.put('/:id', verifyToken, checkPermission('update', MODULE), SeoPageController.update);
router.delete('/:id', verifyToken, checkPermission('delete', MODULE), SeoPageController.delete);

module.exports = router;
