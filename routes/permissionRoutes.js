const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/PermissionController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', checkPermission('read', 'Permissions'), PermissionController.getAll);
router.get('/:id', checkPermission('read', 'Permissions'), PermissionController.getById);
router.post('/', checkPermission('create', 'Permissions'), PermissionController.create);
router.put('/:id', checkPermission('update', 'Permissions'), PermissionController.update);
router.delete('/:id', checkPermission('delete', 'Permissions'), PermissionController.delete);

module.exports = router;
