const express = require('express');
const router = express.Router();
const TechnologyController = require('../controllers/TechnologyController');

router.post('/', TechnologyController.create);
router.get('/', TechnologyController.getAll);
router.get('/:id', TechnologyController.getById);
router.put('/:id', TechnologyController.update);
router.delete('/:id', TechnologyController.delete);

module.exports = router;
