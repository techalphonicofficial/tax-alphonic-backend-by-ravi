const express = require('express');
const router = express.Router();
const BlogAuthorController = require('../controllers/BlogAuthorController');

router.get('/', BlogAuthorController.getAll);
router.get('/:id', BlogAuthorController.getById);
router.post('/', BlogAuthorController.create);
router.put('/:id', BlogAuthorController.update);
router.delete('/:id', BlogAuthorController.delete);

module.exports = router;