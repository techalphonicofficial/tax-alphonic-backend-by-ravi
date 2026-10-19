const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');

router.get('/', testimonialController.getAll);
router.get('/:id', testimonialController.getById);
router.post('/', testimonialController.create);
router.put('/:id', testimonialController.update);
router.delete('/:id', testimonialController.delete);

module.exports = router;
