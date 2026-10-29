const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { checkSlug } = require('../services/slugRegistry');
const { successResponse } = require('../utils/responseFormatter');

// GET /slugs/check?type=service&slug=xyz[&id=5] → { slug, available, reason, conflict, suggestion }
// Used by the admin forms while the slug is typed. Types: services/slugRegistry.js KINDS.
// Saving is checked again by the model hooks, so this is only a convenience.
router.get('/check', verifyToken, async (req, res, next) => {
  try {
    const { type, slug, id } = req.query;
    const result = await checkSlug(String(type || ''), slug, { id: id || null });
    return successResponse(res, result.available ? 'Slug is available' : 'Slug is not available', result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
