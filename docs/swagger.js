const fs = require('fs');
const path = require('path');

// Keep this map in sync with routes/index.js. Each router is read directly so
// the Swagger page cannot drift when a route is added or removed.
const routeModules = {
  authRoutes: 'auth',
  userRoutes: 'users',
  roleRoutes: 'roles',
  permissionRoutes: 'permissions',
  auditLogRoutes: 'audit-logs',
  profileRoutes: 'profile',
  pageRoutes: 'pages',
  landingPageRoutes: 'landing-pages',
  serviceCategoryRoutes: 'service-categories',
  serviceRoutes: 'services',
  portfolioCategoryRoutes: 'portfolio-categories',
  portfolioItemRoutes: 'portfolio-items',
  testimonialRoutes: 'testimonials',
  teamRoutes: 'team',
  faqRoutes: 'faqs',
  bannerRoutes: 'banners',
  mediaRoutes: 'media',
  seoRoutes: 'seo',
  settingRoutes: 'settings',
  aboutPageRoutes: 'about-page',
  blogRoutes: 'blogs',
  blogcategoriesRoutes: 'blog-categories',
  blogtagsRoutes: 'blog-tags',
  blogauthorsRoutes: 'blog-authors',
  branchRoutes: 'branches',
  partnerRoutes: 'partners',
  countryRoutes: 'countries',
  pageCategoryRoutes: 'page-categories',
  menuRoutes: 'menus',
  packageRoutes: 'packages',
  dashboardRoutes: 'dashboard',
  stateRoutes: 'states',
  locationRoutes: 'locations',
  industryRoutes: 'industries',
  technologyRoutes: 'technologies',
  problemRoutes: 'problems',
  seopageRoutes: 'seo-pages',
  inquiryRoutes: 'inquiries',
  formRoutes: 'forms',
  systemLogRoutes: 'system-logs'
};

const routeDirectory = path.join(__dirname, '..', 'routes');
const successResponse = {
  description: 'Successful response',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiResponse' }
    }
  }
};

function titleFromSegment(segment) {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getUploadFields(line) {
  if (!line.includes('upload.')) return null;

  const properties = {};
  const singleMatch = line.match(/upload\.single\(['"]([^'"]+)['"]\)/);
  const arrayMatch = line.match(/upload\.array\(['"]([^'"]+)['"]/);
  const namedMatches = [...line.matchAll(/name:\s*['"]([^'"]+)['"]/g)];

  if (singleMatch) properties[singleMatch[1]] = { type: 'string', format: 'binary' };
  if (arrayMatch) properties[arrayMatch[1]] = {
    type: 'array',
    items: { type: 'string', format: 'binary' }
  };
  namedMatches.forEach((match) => {
    properties[match[1]] = { type: 'string', format: 'binary' };
  });

  return {
    'multipart/form-data': {
      schema: { type: 'object', properties, additionalProperties: true }
    }
  };
}

function requestBodyFor(method, line) {
  if (!['post', 'put', 'patch'].includes(method)) return undefined;

  const multipart = getUploadFields(line);
  if (multipart) return { required: false, content: multipart };

  return {
    required: false,
    content: {
      'application/json': {
        schema: { type: 'object', additionalProperties: true },
        example: {}
      }
    }
  };
}

function buildPaths() {
  const paths = {};
  const pattern = /router\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g;

  Object.entries(routeModules).forEach(([fileName, segment]) => {
    const filePath = path.join(routeDirectory, `${fileName}.js`);
    if (!fs.existsSync(filePath)) return;

    const source = fs.readFileSync(filePath, 'utf8');
    const protectedFrom = source.indexOf('router.use(verifyToken)');
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const [, method, , routePath] = match;
      const lineEnd = source.indexOf('\n', match.index);
      const line = source.slice(match.index, lineEnd === -1 ? source.length : lineEnd);
      const endpoint = `/api/v1/${segment}${routePath === '/' ? '' : routePath}`
        .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      // requirePermission(...) / can(...) (landing pages) include verifyToken.
      const isProtected = line.includes('verifyToken') || line.includes('requirePermission') || /\bcan\(/.test(line) ||
        (protectedFrom !== -1 && match.index > protectedFrom);
      const parameters = [...endpoint.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(([, name]) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${name} route parameter`
      }));

      paths[endpoint] ||= {};
      paths[endpoint][method] = {
        tags: [titleFromSegment(segment)],
        summary: `${method.toUpperCase()} ${endpoint}`,
        operationId: `${method}_${segment.replace(/-/g, '_')}_${routePath.replace(/[^A-Za-z0-9]+/g, '_') || 'root'}`,
        ...(parameters.length ? { parameters } : {}),
        ...(isProtected ? { security: [{ bearerAuth: [] }] } : {}),
        ...(requestBodyFor(method, line) ? { requestBody: requestBodyFor(method, line) } : {}),
        responses: {
          200: successResponse,
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' }
        }
      };
    }
  });

  return paths;
}

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'TaxAlphonic CMS Backend API',
    version: '1.0.0',
    description: 'Interactive API documentation. Use Authorize to add a JWT bearer token before calling protected endpoints.'
  },
  servers: [
    { url: '/', description: 'Current server' }
  ],
  tags: Object.values(routeModules).map((segment) => ({ name: titleFromSegment(segment) })),
  paths: buildPaths(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT returned by the login API. Do not include the word Bearer.'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { nullable: true }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: {} }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Invalid request data',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      Unauthorized: {
        description: 'Missing, expired, or invalid access token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      ServerError: {
        description: 'Internal server error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      }
    }
  }
};
