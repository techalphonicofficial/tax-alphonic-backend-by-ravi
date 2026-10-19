const express = require('express');
const router = express.Router();
const multer = require('multer');
const MediaController = require('../controllers/MediaController');
const { withContext } = require('../middlewares/upload');
const StorageSettingsController = require('../controllers/StorageSettingsController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Using memory storage because we process with sharp before saving
const storage = multer.memoryStorage();
const upload = withContext(multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video/audio
}));

// Admin only: every media route needs a login and the Media permission for its action.
router.use(verifyToken);
const can = (action) => checkPermission(action, 'Media');

// === STORAGE SETTINGS (Media → Media Settings) ===
router.get('/storage-settings', can('read'), StorageSettingsController.get);
router.post('/storage-settings/test', can('update'), StorageSettingsController.test);
router.put('/storage-settings', can('update'), StorageSettingsController.save);

// === MEDIA FOLDERS ===
router.post('/folders', can('create'), MediaController.createFolder);
router.get('/folders', can('read'), MediaController.getFolders);
router.put('/folders/:id', can('update'), MediaController.updateFolder);
router.delete('/folders/:id', can('delete'), MediaController.deleteFolder);

// === MEDIA CATEGORIES ===
router.post('/categories', can('create'), MediaController.createCategory);
router.get('/categories', can('read'), MediaController.getCategories);
router.delete('/categories/:id', can('delete'), MediaController.deleteCategory);

// === MEDIA FILES ===
router.post('/upload', can('create'), upload.single('file'), MediaController.uploadMedia);
router.post('/upload/bulk', can('create'), upload.array('files', 50), MediaController.uploadBulkMedia);
router.get('/', can('read'), MediaController.getMedia);
router.get('/:id', can('read'), MediaController.getMediaById);
router.put('/:id', can('update'), MediaController.updateMedia);
router.delete('/:id', can('delete'), MediaController.deleteMedia); // Soft delete (Trash)
router.post('/:id/restore', can('delete'), MediaController.restoreMedia);
router.delete('/:id/force', can('delete'), MediaController.forceDeleteMedia);

module.exports = router;
