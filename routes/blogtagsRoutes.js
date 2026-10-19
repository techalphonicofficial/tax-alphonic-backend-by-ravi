const express = require('express');
const router = express.Router();
const BlogTagController = require('../controllers/BlogTagController');

router.get('/', BlogTagController.getAll);
router.get('/:id', BlogTagController.getById);
router.post('/', BlogTagController.create);
router.put('/:id', BlogTagController.update);
router.delete('/:id', BlogTagController.delete);

module.exports = router;