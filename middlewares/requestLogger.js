const { logger } = require('../config/logger');

// General + error log: one line per API hit, written when the response finishes.
//   2xx/3xx -> INFO  (generallogs.txt)
//   4xx     -> WARN  (generallogs.txt + errorlogs.txt)
//   5xx     -> ERROR (generallogs.txt + errorlogs.txt, with stack when available)
const requestLogger = (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const context = req.context || {};

    // Capture the API's own error message ({ success: false, message }) for the log line
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (body && body.success === false) {
            res.locals.errorMessage = body.message;
            if (Array.isArray(body.errors) && body.errors.length > 0) {
                res.locals.errorDetails = body.errors;
            }
        }
        return originalJson(body);
    };

    res.on('finish', () => {
        const status = res.statusCode;
        const durationMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

        let message = `${req.method} ${req.originalUrl} -> ${status}`;
        if (res.locals.errorMessage) message += ` : ${res.locals.errorMessage}`;
        if (res.locals.errorDetails) {
            const details = res.locals.errorDetails
                .map(e => (typeof e === 'object' ? (e.message || e.msg || JSON.stringify(e)) : String(e)))
                .join('; ');
            message += ` [${details}]`;
        }
        if (res.locals.errorStack) message += `\n${res.locals.errorStack}`;

        logger.log(level, message, {
            requestId: context.requestId,
            method: req.method,
            url: req.originalUrl,
            status,
            durationMs,
            ip: context.ip,
            // verifyToken may have loaded the user after the context was created
            user: req.user?.email || context.user?.email
        });
    });

    next();
};

module.exports = requestLogger;
