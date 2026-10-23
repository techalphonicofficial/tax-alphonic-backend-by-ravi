const express = require('express');
const router = express.Router();
const LandingPageController = require('../controllers/LandingPageController');
const v = require('../validators/landingPageValidator');
const { requirePermission } = require('../middlewares/auth');

// Landing pages on subdomains (admin: Landing Pages). Permissions: module "LandingPages",
// actions read / create / update / preview / publish / unpublish / archive
// (migration 20261023000001-seed-landing-page-permissions.js).
const MODULE = 'LandingPages';
const can = (action) => requirePermission(action, MODULE);

// Public: the website resolves a subdomain (?host=cbdt.taxalphonic.com or ?slug=cbdt) to the
// live version of a published landing page. Drafts, archived and unpublished pages → 404.
router.get('/public/resolve', v.resolveQuery, LandingPageController.resolve);

// Admin only.
router.get('/', ...can('read'), v.listQuery, LandingPageController.list);
router.get('/service-options', ...can('read'), LandingPageController.serviceOptions);
router.get('/check-slug', ...can('read'), v.slugQuery, LandingPageController.checkSlug);
router.post('/', ...can('create'), v.createSchema, LandingPageController.create);
router.get('/:id', ...can('read'), v.idParam, LandingPageController.getById);
router.put('/:id', ...can('update'), v.updateSchema, LandingPageController.updateSettings);
router.put('/:id/draft', ...can('update'), v.draftSchema, LandingPageController.saveDraft);
router.get('/:id/preview', ...can('preview'), v.idParam, LandingPageController.preview);
router.get('/:id/validate', ...can('publish'), v.idParam, LandingPageController.validate);
router.post('/:id/publish', ...can('publish'), v.idParam, LandingPageController.publish);
router.post('/:id/unpublish', ...can('unpublish'), v.idParam, LandingPageController.unpublish);
router.post('/:id/archive', ...can('archive'), v.idParam, LandingPageController.archive);
router.post('/:id/unarchive', ...can('archive'), v.idParam, LandingPageController.unarchive);
router.get('/:id/versions', ...can('read'), v.idParam, LandingPageController.versions);
router.post('/:id/versions/:versionId/restore', ...can('update'), v.versionParams, LandingPageController.restoreVersion);
// Old versions only (never the live one); managed by whoever may publish.
router.delete('/:id/versions/:versionId', ...can('publish'), v.versionParams, LandingPageController.deleteVersion);

module.exports = router;
