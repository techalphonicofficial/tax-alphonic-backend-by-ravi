const express = require('express');
const router = express.Router();
const BannerController = require('../controllers/BannerController');
const upload = require('../middlewares/upload');
const { requirePermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Banners'];

// The website lists banners without a login: only published ones (publicRead). Everything else needs a login.
router.get('/', publicRead(MODULE, 'published'), BannerController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), BannerController.getById);
router.post('/', ...requirePermission('create', MODULE), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), BannerController.create);
router.put('/:id', ...requirePermission('update', MODULE), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), BannerController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), BannerController.delete);

module.exports = router;
