const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/MenuController');
const { verifyToken, checkPermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Menus'];

// The website reads the header / footer menus without a login: only active menus (publicRead).
router.get('/', publicRead(MODULE, 'active'), MenuController.getAll);

// Everything else needs a login.
router.use(verifyToken);
router.get('/:id', checkPermission('read', MODULE), MenuController.getById);
// Also used by the service editor (adds the service to a menu).
router.post('/link-item', checkPermission('update', [...MODULE, 'Services']), MenuController.linkItem);
router.post('/', checkPermission('create', MODULE), MenuController.create);
router.put('/:id', checkPermission('update', MODULE), MenuController.update);
router.delete('/:id', checkPermission('delete', MODULE), MenuController.delete);

module.exports = router;
