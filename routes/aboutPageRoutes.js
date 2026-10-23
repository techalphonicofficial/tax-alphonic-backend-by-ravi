const express = require('express');
const router = express.Router();
const AboutPageController = require('../controllers/AboutPageController');
const upload = require('../middlewares/upload');
const { requirePermission } = require('../middlewares/auth');

// Public: the website's /about page and the homepage About block.
router.get('/', AboutPageController.getSettings);
// Admin only (login before the upload, so nothing is written for anonymous requests).
router.put('/', ...requirePermission('update', ['CMS', 'AboutPage']), upload.fields([{ name: 'aboutImage', maxCount: 1 }, { name: 'homeAboutImage', maxCount: 1 }]), AboutPageController.updateSettings);

module.exports = router;
