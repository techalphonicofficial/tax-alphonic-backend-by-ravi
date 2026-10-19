const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', checkPermission('read', 'Users'), UserController.getAll);
router.get('/:id', checkPermission('read', 'Users'), UserController.getById);
router.post('/', checkPermission('create', 'Users'), UserController.create);
router.put('/:id', checkPermission('update', 'Users'), UserController.update);
router.delete('/:id', checkPermission('delete', 'Users'), UserController.delete);

module.exports = router;
