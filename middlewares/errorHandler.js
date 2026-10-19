// Global error handler: errors thrown or passed to next(err) end up here.
// The stack is handed to requestLogger so the request is logged as a single
// ERROR line in errorlogs.txt.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
        res.locals.errorStack = err.stack;
    }

    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
        data: null
    });
};

// Unknown API route
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        errors: [],
        data: null
    });
};

module.exports = { errorHandler, notFoundHandler };
