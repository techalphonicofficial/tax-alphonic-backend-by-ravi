const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const requestLogger = require('./middlewares/requestLogger');
const requestContext = require('./middlewares/requestContext');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// General/error request logging (logs/generallogs.txt, logs/errorlogs.txt).
// Mounted first so rate-limited and failed requests are logged too.
app.use((req, res, next) => (req.path.startsWith('/uploads') ? next() : requestLogger(req, res, next)));

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: '*', credentials: true })); // Update origin in production

// Rate Limiter
// const apiLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Increase limit drastically for development and testing
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
// });
// app.use('/api/', apiLimiter);

// Serve static files (like uploads)
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'), {
    crossOriginResourcePolicy: false,
}));

// Payload handling
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

// Per-request context (requestId, ip, user) for logs and the audit log.
// Must stay after the body parsers.
app.use(requestContext);

// Interactive API documentation. Protected endpoints can be tested after using
// the Authorize button to supply a JWT returned by /api/v1/auth/login.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'TaxAlphonic CMS API Docs',
    swaggerOptions: { persistAuthorization: true }
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Base Route
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'CMS Backend API is running.', data: null });
});

// Import Routes
const portfolioCategoryRoutes = require('./routes/portfolioCategory.routes');
const portfolioItemRoutes = require('./routes/portfolioItem.routes');
const routes = require('./routes');
// Slug clash check on every save / restore of services, pages, pSEO pages, blogs, categories, forms.
require('./services/slugRegistry').watchSlugs();
app.use('/api/v1/portfolio-categories', portfolioCategoryRoutes);
app.use('/api/v1/portfolio-items', portfolioItemRoutes);
app.use('/api/v1', routes);

// Unknown API routes -> JSON 404 (logged as a warning)
app.use('/api', notFoundHandler);

// Global Error Handler (logged with stack by requestLogger)
app.use(errorHandler);

module.exports = app;
// Force nodemon restart to load Banner module
