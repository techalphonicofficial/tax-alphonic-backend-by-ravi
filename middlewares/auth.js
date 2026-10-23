const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');
const { errorResponse } = require('../utils/responseFormatter');

class AuthError extends Error {}

/**
 * The logged-in user of a request (with role and permissions), from the Bearer token.
 * Throws AuthError when there is no token, it is invalid / expired, or the account is
 * deactivated or deleted: every request checks the account again, so deactivating a user
 * locks them out at once, even with a token issued before.
 */
async function userFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('No token provided, authorization denied');
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
  } catch (error) {
    throw new AuthError(error.name === 'TokenExpiredError' ? 'Session expired. Please login again.' : 'Token is not valid');
  }

  const user = await User.findByPk(decoded.id, {
    include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }]
  });
  if (!user || !user.isActive) {
    throw new AuthError('User account is deactivated or deleted');
  }
  return user;
}

/**
 * `module` may be a list: any one of them is enough. Routes list the admin sidebar's module
 * (e.g. 'CMS', which shows the page) and the specific one (e.g. 'FAQs'), so either grant works.
 */
function hasPermission(user, action, module) {
  if (!user || !user.role) return false;
  if (user.role.name === 'Admin') return true; // Super Admin override
  const modules = Array.isArray(module) ? module : [module];
  return (user.role.permissions || []).some((p) => p.action === action && modules.includes(p.module));
}

// 401 makes the admin panel log the user out (src/services/api.js). (errorResponse takes
// (res, message, errors, status): the status used to be passed as `errors`, so these went out as 400.)
const verifyToken = async (req, res, next) => {
  try {
    req.user = await userFromRequest(req);
    next();
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(res, error.message, [], 401);
    return errorResponse(res, 'Server error during authentication', [], 500);
  }
};

const checkPermission = (action, module) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.role) {
        return errorResponse(res, 'You are not authorized to access this page.', [], 403);
      }
      if (!hasPermission(user, action, module)) {
        return errorResponse(res, 'You do not have permission to perform this action.', [], 403);
      }
      next();
    } catch (error) {
      return errorResponse(res, 'Server error during authorization', [], 500);
    }
  };
};

/** verifyToken + checkPermission in one: `router.put('/:id', ...requirePermission('update', 'FAQs'), handler)`. */
const requirePermission = (action, module) => [verifyToken, checkPermission(action, module)];

/**
 * Lists the website reads without a login (homepage modules, menus, portfolio). A logged-in,
 * active user who may read `module` gets the full list (drafts included) as before; anyone else
 * only gets live records: every status filter in the query is replaced by `status = liveStatus`.
 */
const publicRead = (module, liveStatus) => async (req, res, next) => {
  try {
    const user = await userFromRequest(req);
    if (hasPermission(user, 'read', module)) {
      req.user = user;
      return next();
    }
  } catch (error) {
    if (!(error instanceof AuthError)) return errorResponse(res, 'Server error during authentication', [], 500);
  }

  const query = Object.fromEntries(Object.entries(req.query || {}).filter(([key]) => !key.startsWith('status')));
  query.status = liveStatus;
  // Express 5 computes req.query from the URL on every read, so replace it on this request.
  Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true });
  next();
};

module.exports = { verifyToken, checkPermission, requirePermission, publicRead, hasPermission };
