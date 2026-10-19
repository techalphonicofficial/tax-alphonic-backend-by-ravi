const express = require('express');
const router = express.Router();
const SystemLogController = require('../controllers/SystemLogController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// :type = general | error  (logs/generallogs.txt, logs/errorlogs.txt)
router.use(verifyToken);
router.get('/:type', checkPermission('read', 'SystemLogs'), SystemLogController.getEntries);
router.get('/:type/download', checkPermission('read', 'SystemLogs'), SystemLogController.download);
router.delete('/:type', checkPermission('delete', 'SystemLogs'), SystemLogController.clear);

module.exports = router;
