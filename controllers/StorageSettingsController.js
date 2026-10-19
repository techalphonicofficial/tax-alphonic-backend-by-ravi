const StorageService = require('../services/storage/StorageService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

// Admin: Media → Media Settings (where uploaded files are stored).
class StorageSettingsController {
  async get(req, res) {
    try {
      const settings = await StorageService.getForAdmin();
      return successResponse(res, 'Storage settings', { ...settings, catalog: StorageService.catalog() });
    } catch (error) {
      logger.error(`Get storage settings Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  /** POST { provider, settings } — tests the typed settings (saved secrets fill empty fields). */
  async test(req, res) {
    try {
      const { provider, settings } = req.body || {};
      const result = await StorageService.testConnection(provider, settings || {});
      return successResponse(res, result.ok ? 'Connection works' : 'Connection test failed', result);
    } catch (error) {
      logger.error(`Storage test Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  /** PUT { provider, settings, activate } — saves (a cloud provider is activated only after a passing test). */
  async save(req, res) {
    try {
      const result = await StorageService.save(req.body || {});
      return successResponse(res, 'Storage settings saved', result);
    } catch (error) {
      logger.error(`Save storage settings Error: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message,
        errors: [{ field: 'provider', message: error.message }],
        data: error.test ? { test: error.test } : null,
      });
    }
  }
}

module.exports = new StorageSettingsController();
