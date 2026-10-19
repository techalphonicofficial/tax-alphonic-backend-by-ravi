const express = require('express');
const router = express.Router();
const StateController = require('../controllers/StateController');

router.post('/', StateController.create);
router.get('/', StateController.getAll);
router.get('/:id', StateController.getById);
router.put('/:id', StateController.update);
router.delete('/:id', StateController.delete);

module.exports = router;
