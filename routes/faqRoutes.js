const express = require('express');
const router = express.Router();
const FaqController = require('../controllers/FaqController');

router.post('/', FaqController.create);
router.get('/', FaqController.getAll);
router.get('/:id', FaqController.getById);
router.put('/:id', FaqController.update);
router.delete('/:id', FaqController.delete);

module.exports = router;
