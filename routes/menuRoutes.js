const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/MenuController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.get('/', MenuController.getAll);
router.get('/:id', MenuController.getById);

// Admin-only Routes
router.use(verifyToken);
router.post('/link-item', MenuController.linkItem);
router.post('/', checkPermission('create', 'Menus'), MenuController.create);
router.put('/:id', checkPermission('update', 'Menus'), MenuController.update);
router.delete('/:id', checkPermission('delete', 'Menus'), MenuController.delete);

module.exports = router;
