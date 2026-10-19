const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/ProfileController');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', ProfileController.getProfile);
router.put('/', ProfileController.updateProfile);
router.post('/change-password', ProfileController.changePassword);

module.exports = router;
