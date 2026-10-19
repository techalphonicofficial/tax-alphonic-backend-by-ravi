const express = require('express');
const router = express.Router();
const AuditLogController = require('../controllers/AuditLogController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.use(verifyToken);
router.use(checkPermission('read', 'AuditLogs'));

router.get('/', AuditLogController.getAll);
router.get('/filters', AuditLogController.getFilters);
router.get('/:id', AuditLogController.getById);

module.exports = router;
