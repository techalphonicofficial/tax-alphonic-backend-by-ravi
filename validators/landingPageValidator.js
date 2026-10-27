const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseFormatter');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation Error', errors.array().map((e) => ({ field: e.path, message: e.msg })), 422);
  }
  next();
};

const id = param('id').isUUID().withMessage('Invalid landing page id');
const seo = [
  body('metaTitle').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('metaDescription').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('keywords').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('ogImage').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('robots').optional({ nullable: true }).isString().isLength({ max: 100 }),
];

// Slug / reserved names / uniqueness and block content are checked in LandingPageService.
module.exports = {
  idParam: [id, validate],
  versionParams: [id, param('versionId').isUUID().withMessage('Invalid version id'), validate],
  listQuery: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('serviceId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid service id'),
    query('status').optional({ values: 'falsy' }).isIn(['draft', 'published', 'archived', 'all']),
    query('search').optional().isString().isLength({ max: 100 }),
    validate,
  ],
  slugQuery: [query('slug').isString().isLength({ max: 100 }), query('exceptId').optional({ values: 'falsy' }).isUUID(), validate],
  createSchema: [
    body('title').isString().withMessage('Title is required').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('slug').isString().withMessage('URL name is required').trim().notEmpty().withMessage('URL name is required').isLength({ max: 63 }),
    body('serviceId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid service id'),
    body('copyServiceBlocks').optional().isBoolean(),
    body('sections').optional().isArray().withMessage('Sections must be an array'),
    ...seo,
    validate,
  ],
  updateSchema: [
    id,
    body('title').optional().isString().isLength({ max: 255 }),
    body('slug').optional().isString().isLength({ max: 63 }),
    body('serviceId').optional({ nullable: true, values: 'falsy' }).isUUID().withMessage('Invalid service id'),
    ...seo,
    validate,
  ],
  draftSchema: [id, body('sections').isArray().withMessage('Sections must be an array'), validate],
  resolveQuery: [
    query('host').optional().isString().isLength({ max: 253 }),
    query('slug').optional().isString().isLength({ max: 63 }),
    validate,
  ],
};
