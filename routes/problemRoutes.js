const express = require('express');
const router = express.Router();
const ProblemController = require('../controllers/ProblemController');
const { requirePermission } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['SEO', 'Problems'];

router.get('/', ...requirePermission('read', MODULE), ProblemController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), ProblemController.getById);
router.post('/', ...requirePermission('create', MODULE), ProblemController.create);
router.put('/:id', ...requirePermission('update', MODULE), ProblemController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), ProblemController.delete);

module.exports = router;
