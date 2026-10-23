const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const { verifyToken, checkPermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'Branches'];

// The website lists them without a login: only active ones (publicRead).
router.get('/', publicRead(MODULE, 'active'), BranchController.getAll);

// Everything else needs a login.
router.use(verifyToken);
router.get('/:id', checkPermission('read', MODULE), BranchController.getById);

router.post('/', checkPermission('create', MODULE), BranchController.create);
router.put('/:id', checkPermission('update', MODULE), BranchController.update);
router.delete('/:id', checkPermission('delete', MODULE), BranchController.delete);

module.exports = router;
