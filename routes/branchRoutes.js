const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Public read endpoints for website
router.get('/', BranchController.getAll);
router.get('/:id', BranchController.getById);

// Protected admin mutation endpoints
router.use(verifyToken);
router.post('/', checkPermission('create', 'Branches'), BranchController.create);
router.put('/:id', checkPermission('update', 'Branches'), BranchController.update);
router.delete('/:id', checkPermission('delete', 'Branches'), BranchController.delete);

module.exports = router;
