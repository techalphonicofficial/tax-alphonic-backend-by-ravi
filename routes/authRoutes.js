const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { requirePermission } = require('../middlewares/auth');

// Public: the admin login and password reset screens.
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Creating accounts is for admins only (Access Control → Users); there is no public sign-up.
router.post('/register', ...requirePermission('create', 'Users'), AuthController.register);

module.exports = router;
