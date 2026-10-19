const express = require('express');
const router = express.Router();
const IndustryController = require('../controllers/IndustryController');

router.post('/', IndustryController.create);
router.get('/', IndustryController.getAll);
router.get('/:id', IndustryController.getById);
router.put('/:id', IndustryController.update);
router.delete('/:id', IndustryController.delete);

module.exports = router;
