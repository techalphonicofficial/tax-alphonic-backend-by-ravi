const express = require('express');
const router = express.Router();
const settingController = require('../controllers/SettingController');
const { verifyToken, checkPermission, requirePermission } = require('../middlewares/auth');

// Groups the website reads without a login (its service/siteSettingsService.js). Every other group
// (smtp, payment, api, security, ...) holds passwords and secret keys and needs a login.
const PUBLIC_GROUPS = new Set(['organization', 'contact', 'address', 'social']);

const readGroup = (req, res, next) => {
  if (PUBLIC_GROUPS.has(String(req.params.group || '').toLowerCase())) return next();
  return verifyToken(req, res, () => checkPermission('read', 'Settings')(req, res, next));
};

router.get('/:group', readGroup, settingController.getGroupSettings);
router.put('/:group', ...requirePermission('update', 'Settings'), settingController.updateGroupSettings);

module.exports = router;
