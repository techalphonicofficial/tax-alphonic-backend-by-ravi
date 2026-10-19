const express = require('express');
const router = express.Router();
const ProblemController = require('../controllers/ProblemController');

router.post('/', ProblemController.create);
router.get('/', ProblemController.getAll);
router.get('/:id', ProblemController.getById);
router.put('/:id', ProblemController.update);
router.delete('/:id', ProblemController.delete);

module.exports = router;
