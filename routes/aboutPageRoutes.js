const express = require('express');
const router = express.Router();
const AboutPageController = require('../controllers/AboutPageController');
const upload = require('../middlewares/upload');

router.get('/', AboutPageController.getSettings);
router.put('/', upload.fields([{ name: 'aboutImage', maxCount: 1 }, { name: 'homeAboutImage', maxCount: 1 }]), AboutPageController.updateSettings);

module.exports = router;
