const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');
const { errorResponse } = require('../utils/responseFormatter');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'No token provided, authorization denied', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Fetch full user with role to ensure they still exist and are active
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }]
    });

    if (!user || !user.isActive) {
      return errorResponse(res, 'User account is deactivated or deleted', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please login again.', 401);
    }
    return errorResponse(res, 'Token is not valid', 401);
  }
};

const checkPermission = (action, module) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.role) {
        return errorResponse(res, 'You are not authorized to access this page.', 403);
      }

      // Super Admin override
      if (user.role.name === 'Admin') {
        return next();
      }

      const permissions = user.role.permissions || [];
      const hasPermission = permissions.some(
        (p) => p.action === action && p.module === module
      );

      if (!hasPermission) {
        return errorResponse(res, 'You do not have permission to perform this action.', 403);
      }

      next();
    } catch (error) {
      return errorResponse(res, 'Server error during authorization', 500);
    }
  };
};

module.exports = { verifyToken, checkPermission };
