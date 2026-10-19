const AiSettingsService = require('../services/AiSettingsService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

const handleError = (res, error, label) => {
  if (error.statusCode) {
    return errorResponse(res, error.message, error.errors || [], error.statusCode);
  }
  logger.error(`${label} Error: ${error.message}`);
  return errorResponse(res, error.message, [], 500);
};

class AiSettingsController {
  async get(req, res) {
    try {
      const data = await AiSettingsService.getForAdmin();
      return successResponse(res, 'AI settings retrieved', data);
    } catch (error) {
      return handleError(res, error, 'Get AI Settings');
    }
  }

  async update(req, res) {
    try {
      const data = await AiSettingsService.update(req.body || {});
      return successResponse(res, 'AI settings saved', data);
    } catch (error) {
      return handleError(res, error, 'Update AI Settings');
    }
  }

  // body: { provider, apiKey? } (apiKey omitted = use the saved key)
  async listModels(req, res) {
    try {
      const { provider, apiKey } = req.body || {};
      const models = await AiSettingsService.listModels(provider, apiKey);
      return successResponse(res, `${models.length} models available`, models);
    } catch (error) {
      return handleError(res, error, 'List AI Models');
    }
  }

  // body: { provider, apiKey?, model? }
  async test(req, res) {
    try {
      const { provider, apiKey, model } = req.body || {};
      const result = await AiSettingsService.testConnection(provider, apiKey, model);
      return successResponse(res, `Connected to ${result.model} in ${result.latencyMs} ms`, result);
    } catch (error) {
      return handleError(res, error, 'Test AI Connection');
    }
  }
}

module.exports = new AiSettingsController();
