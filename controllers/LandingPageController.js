const LandingPageService = require('../services/LandingPageService');
const { LandingPageError } = require('../services/LandingPageService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');
const CustomThemes = require('../services/landing/customThemes');

// Admin + public handlers of /landing-pages (routes/landingPageRoutes.js).
const handle = (label, work, { status = 200, message = 'OK' } = {}) => async (req, res) => {
  try {
    const result = await work(req);
    if (result && result.pagination) {
      const { data, pagination, ...extra } = result;
      return res.status(status).json({ success: true, message, data, errors: [], pagination, ...extra });
    }
    return successResponse(res, message, result, null, status);
  } catch (error) {
    if (error instanceof LandingPageError || error instanceof CustomThemes.ThemeError) return errorResponse(res, error.message, error.errors, error.status);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Validation Error', [{ field: 'slug', message: 'This URL name is already used by another landing page' }], 422);
    }
    logger.error(`${label} Error: ${error.message}`);
    return errorResponse(res, 'Something went wrong while handling the landing page', [], 500);
  }
};

const LandingPageController = {
  // "My themes": custom colour themes shared by every landing page.
  themes: handle('List Landing Themes', () => CustomThemes.list(), { message: 'Custom themes' }),
  saveThemes: handle('Save Landing Themes', (req) => CustomThemes.save(req.body?.themes), { message: 'Custom themes saved' }),
  list: handle('List Landing Pages', (req) => LandingPageService.list(req.query), { message: 'Landing pages retrieved successfully' }),
  serviceOptions: handle('Landing Service Options', () => LandingPageService.serviceOptions(), { message: 'Services retrieved successfully' }),
  checkSlug: handle('Check Landing Slug', (req) => LandingPageService.checkSlug(req.query.slug, req.query.exceptId), { message: 'URL name checked' }),
  getById: handle('Get Landing Page', (req) => LandingPageService.getById(req.params.id), { message: 'Landing page retrieved successfully' }),
  create: handle('Create Landing Page', (req) => LandingPageService.create(req.body, req.user), { status: 201, message: 'Landing page created successfully' }),
  updateSettings: handle('Update Landing Page', (req) => LandingPageService.updateSettings(req.params.id, req.body, req.user), { message: 'Landing page settings saved' }),
  saveDraft: handle('Save Landing Draft', (req) => LandingPageService.saveDraft(req.params.id, req.body.sections, req.user), { message: 'Draft saved' }),
  preview: handle('Preview Landing Page', (req) => LandingPageService.preview(req.params.id), { message: 'Draft preview' }),
  validate: handle('Validate Landing Page', async (req) => {
    const row = await LandingPageService.find(req.params.id);
    const page = await LandingPageService.getById(req.params.id);
    const errors = await LandingPageService.validateForPublish(row, page.sections);
    return { ready: errors.length === 0, errors };
  }, { message: 'Landing page checked' }),
  publish: handle('Publish Landing Page', (req) => LandingPageService.publish(req.params.id, req.user), { message: 'Landing page published' }),
  unpublish: handle('Unpublish Landing Page', (req) => LandingPageService.unpublish(req.params.id, req.user), { message: 'Landing page unpublished' }),
  archive: handle('Archive Landing Page', (req) => LandingPageService.archive(req.params.id, req.user), { message: 'Landing page archived' }),
  unarchive: handle('Restore Landing Page', (req) => LandingPageService.unarchive(req.params.id, req.user), { message: 'Landing page restored as a draft' }),
  versions: handle('Landing Page Versions', (req) => LandingPageService.versions(req.params.id), { message: 'Versions retrieved successfully' }),
  deleteVersion: handle('Delete Landing Version', (req) => LandingPageService.deleteVersion(req.params.id, req.params.versionId), { message: 'Version deleted' }),
  restoreVersion: handle('Restore Landing Version', (req) => LandingPageService.restoreVersion(req.params.id, req.params.versionId, req.user), { message: 'Version copied into the draft' }),

  // Public: only the live version of a published landing page, else 404.
  async resolve(req, res) {
    try {
      const page = await LandingPageService.resolvePublic({ host: req.query.host, slug: req.query.slug });
      if (!page) return errorResponse(res, 'Landing page not found', [], 404);
      res.set('Cache-Control', 'no-store');
      return successResponse(res, 'Landing page retrieved successfully', page);
    } catch (error) {
      logger.error(`Resolve Landing Page Error: ${error.message}`);
      return errorResponse(res, 'Landing page not found', [], 404);
    }
  },
};

module.exports = LandingPageController;
