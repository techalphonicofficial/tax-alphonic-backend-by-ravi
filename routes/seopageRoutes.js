const express = require('express');
const router = express.Router();
const SeoPageController = require('../controllers/SeoPageController');
const AiSettingsController = require('../controllers/AiSettingsController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// AI: these spend the provider API key, so they require an admin login
router.get('/ai-settings', verifyToken, checkPermission('read', 'SEO'), AiSettingsController.get);
router.put('/ai-settings', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.update);
router.post('/ai-settings/models', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.listModels);
router.post('/ai-settings/test', verifyToken, checkPermission('update', 'SEO'), AiSettingsController.test);
router.get('/ai-config', verifyToken, checkPermission('read', 'SEO'), SeoPageController.getAiConfig);
router.post('/bulk-generate-ai', verifyToken, checkPermission('update', 'SEO'), SeoPageController.triggerBulkGenai);
router.post('/generate-ai/:id', verifyToken, checkPermission('update', 'SEO'), SeoPageController.triggerGenai);

router.post('/', SeoPageController.create);
router.post('/bulk-generate', SeoPageController.bulkGenerate);
router.get('/combos', SeoPageController.getCombos);
router.get('/admin-list', verifyToken, checkPermission('read', 'SEO'), SeoPageController.adminList);
router.post('/bulk-status', verifyToken, checkPermission('update', 'SEO'), SeoPageController.bulkStatus);
router.get('/related', SeoPageController.getRelated);
router.get('/', SeoPageController.getAll);
router.get('/lookup', SeoPageController.getBySlug);
router.get('/by-service/:identifier', SeoPageController.getByService);
router.get('/:id', SeoPageController.getById);
router.put('/:id', SeoPageController.update);
router.delete('/:id', SeoPageController.delete);

module.exports = router;
