const express = require('express');
const router = express.Router();
const TeamMemberController = require('../controllers/TeamMemberController');
const upload = require('../middlewares/upload'); // Assuming this exists

router.post('/', upload.single('image'), TeamMemberController.create);
router.get('/', TeamMemberController.getAll);
router.get('/:id', TeamMemberController.getById);
router.put('/:id', upload.single('image'), TeamMemberController.update);
router.delete('/:id', TeamMemberController.delete);

module.exports = router;
