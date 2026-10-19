const { body, param } = require('express-validator');
const { errorResponse } = require('../utils/responseFormatter');
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation Error', errors.array(), 422);
    }
    next();
};

const createPageSchema = [
    body('title').notEmpty().withMessage('Title is required').isString(),
    body('slug').notEmpty().withMessage('Slug is required').isString(),
    body('content').optional().isString(),
    body('sections').optional({ nullable: true }).isArray().withMessage('Sections must be an array'),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    validate
];

const updatePageSchema = [
    param('id').isUUID().withMessage('Invalid Page ID'),
    body('title').optional().isString(),
    body('slug').optional().isString(),
    body('sections').optional({ nullable: true }).isArray().withMessage('Sections must be an array'),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    validate
];

module.exports = {
    createPageSchema,
    updatePageSchema
};
