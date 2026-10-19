const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/RoleController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', checkPermission('read', 'Roles'), RoleController.getAll);
router.get('/:id', checkPermission('read', 'Roles'), RoleController.getById);
router.post('/', checkPermission('create', 'Roles'), RoleController.create);
router.put('/:id', checkPermission('update', 'Roles'), RoleController.update);
router.delete('/:id', checkPermission('delete', 'Roles'), RoleController.delete);

module.exports = router;
