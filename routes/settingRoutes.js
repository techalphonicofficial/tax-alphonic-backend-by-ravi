const express = require('express');
const router = express.Router();
const settingController = require('../controllers/SettingController');

router.get('/:group', settingController.getGroupSettings);
router.put('/:group', settingController.updateGroupSettings);

module.exports = router;
