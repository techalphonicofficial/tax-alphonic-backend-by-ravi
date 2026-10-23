const express = require('express');
const router = express.Router();
const PortfolioItemController = require('../controllers/PortfolioItemController');
const { requirePermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['Portfolio', 'PortfolioItems'];

// The website lists portfolio items without a login: only published ones (publicRead). Everything else needs a login.
router.get('/', publicRead(MODULE, 'published'), PortfolioItemController.getItems);
router.get('/:id', ...requirePermission('read', MODULE), PortfolioItemController.getItemById);
router.post('/', ...requirePermission('create', MODULE), PortfolioItemController.createItem);
router.put('/:id', ...requirePermission('update', MODULE), PortfolioItemController.updateItem);
router.delete('/:id', ...requirePermission('delete', MODULE), PortfolioItemController.deleteItem);

module.exports = router;
