const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { requirePermission, verifyToken } = require('../middlewares/auth');
const { successResponse } = require('../utils/responseFormatter');

// Public: the admin login and password reset screens.
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// The logged-in user with their role's current permissions. The admin panel reloads it on every
// start, so a role change shows at once (menus, buttons and pages follow it); the API checks
// permissions on every request anyway.
router.get('/me', verifyToken, (req, res) => {
  const { id, firstName, lastName, email, avatar, role } = req.user;
  return successResponse(res, 'Current user', {
    id, firstName, lastName, email, avatar,
    role: role ? {
      id: role.id,
      name: role.name,
      permissions: (role.permissions || []).map((p) => ({ id: p.id, action: p.action, module: p.module })),
    } : null,
  });
});

// Creating accounts is for admins only (Access Control → Users); there is no public sign-up.
router.post('/register', ...requirePermission('create', 'Users'), AuthController.register);

module.exports = router;
