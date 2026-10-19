const winston = require('winston');
const path = require('path');
const requestContext = require('../utils/requestContext');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

// Log files read by the admin panel (System Logs)
const LOG_FILES = {
    general: path.join(LOG_DIR, 'generallogs.txt'),
    error: path.join(LOG_DIR, 'errorlogs.txt')
};

// One entry per line, columns separated by " | " so the admin viewer can parse them:
// timestamp | LEVEL | requestId | method | url | status | duration | ip | user | message
// Newlines inside the message (stack traces) are written as NEWLINE_MARKER so each
// entry stays on one line (a "\n" escape would clash with Windows paths like "\node_modules").
const SEPARATOR = ' | ';
const NEWLINE_MARKER = ' ⏎ ';

const clean = (value) => (value === undefined || value === null || value === '' ? '-' : String(value).replace(/\s+\|\s+/g, ' / '));

const lineFormat = winston.format.printf(info => {
    const ctx = requestContext.get() || {};
    const message = info.stack && !String(info.message).includes(info.stack)
        ? `${info.message}\n${info.stack}`
        : String(info.message);

    return [
        info.timestamp,
        info.level.toUpperCase(),
        clean(info.requestId || ctx.requestId),
        clean(info.method || ctx.method),
        clean(info.url || ctx.url),
        clean(info.status),
        info.durationMs !== undefined ? `${info.durationMs}ms` : '-',
        clean(info.ip || ctx.ip),
        clean(info.user || ctx.user?.email),
        message.replace(/\r?\n/g, NEWLINE_MARKER)
    ].join(SEPARATOR);
});

const fileFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    lineFormat
);

const rotation = {
    maxsize: 10 * 1024 * 1024, // 10MB, then rotate
    maxFiles: 5,
    tailable: true // newest entries always in the base file
};

const logger = winston.createLogger({
    level: 'info',
    transports: [
        // Every API hit plus every warning/error
        new winston.transports.File({ filename: LOG_FILES.general, level: 'info', format: fileFormat, ...rotation }),
        // Only failures: 4xx (warn), 5xx and thrown errors (error), crashes
        new winston.transports.File({
            filename: LOG_FILES.error,
            level: 'warn',
            format: fileFormat,
            handleExceptions: true,
            handleRejections: true,
            ...rotation
        })
    ],
    exitOnError: false
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
        )
    }));
}

module.exports = { logger, LOG_FILES, SEPARATOR, NEWLINE_MARKER };
