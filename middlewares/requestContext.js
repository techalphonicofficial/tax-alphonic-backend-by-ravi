const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const requestContext = require('../utils/requestContext');

// Opens the per-request context used by the logger and the audit log.
// Must be mounted after the body parsers: their stream callbacks would
// otherwise run outside the context.
const requestContextMiddleware = (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' && forwarded
        ? forwarded.split(',')[0].trim()
        : (req.socket?.remoteAddress || req.ip);

    // Identify the caller from the bearer token when one is sent. This is only
    // for attribution (logs/audit); authorization is still done by verifyToken.
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
            user = { id: decoded.id, email: decoded.email, role: decoded.role };
        } catch (e) {
            // Invalid/expired token: request is treated as anonymous
        }
    }

    const context = {
        requestId: crypto.randomBytes(4).toString('hex'),
        method: req.method,
        url: req.originalUrl,
        ip,
        userAgent: req.headers['user-agent'] ? String(req.headers['user-agent']).substring(0, 255) : null,
        user
    };

    req.context = context;
    res.setHeader('X-Request-Id', context.requestId);
    requestContext.run(context, next);
};

module.exports = requestContextMiddleware;
