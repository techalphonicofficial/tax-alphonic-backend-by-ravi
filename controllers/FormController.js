const FormService = require('../services/FormService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

const handleError = (res, error, context) => {
  logger.error(`${context} Error: ${error.message}`);
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, error.errors.map(e => e.message).join(', '), error.errors.map(e => ({ field: e.path, message: e.message })), 422);
  }
  return errorResponse(res, error.message, error.errors || [], error.statusCode || 400);
};

class FormController {
  async create(req, res) {
    try {
      const item = await FormService.create(req.body);
      return successResponse(res, 'Form created successfully', item, null, 201);
    } catch (error) {
      return handleError(res, error, 'Create Form');
    }
  }

  async getAll(req, res) {
    try {
      const result = await FormService.getAll(req.query);
      return successResponse(res, 'Forms retrieved successfully', result.data, result.pagination);
    } catch (error) {
      return handleError(res, error, 'Get Forms');
    }
  }

  async getById(req, res) {
    try {
      const item = await FormService.getWithUsages(req.params.id);
      return successResponse(res, 'Form retrieved successfully', item);
    } catch (error) {
      return handleError(res, error, 'Get Form');
    }
  }

  async update(req, res) {
    try {
      const item = await FormService.update(req.params.id, req.body);
      return successResponse(res, 'Form updated successfully', item);
    } catch (error) {
      return handleError(res, error, 'Update Form');
    }
  }

  async duplicate(req, res) {
    try {
      const item = await FormService.duplicate(req.params.id);
      return successResponse(res, 'Form duplicated successfully', item, null, 201);
    } catch (error) {
      return handleError(res, error, 'Duplicate Form');
    }
  }

  async delete(req, res) {
    try {
      await FormService.delete(req.params.id, { force: req.query.force === 'true' });
      return successResponse(res, 'Form deleted successfully');
    } catch (error) {
      return handleError(res, error, 'Delete Form');
    }
  }

  // Public: form definition for the website renderer
  async getPublic(req, res) {
    try {
      const item = await FormService.getPublic(req.params.identifier);
      return successResponse(res, 'Form retrieved successfully', item);
    } catch (error) {
      return handleError(res, error, 'Get Public Form');
    }
  }

  // Form Builder: the "Options from" sources (with counts), or one source's current options.
  async optionSources(req, res) {
    try {
      const OptionSources = require('../services/forms/optionSources');
      const { key } = req.params;
      if (!key) return successResponse(res, 'Option sources', await OptionSources.listSources());
      if (!OptionSources.isSource(key)) return handleError(res, Object.assign(new Error('Unknown option source'), { statusCode: 404 }), 'Form Option Source');
      return successResponse(res, 'Options', await OptionSources.optionsFor(key, req.query));
    } catch (error) {
      return handleError(res, error, 'Form Option Sources');
    }
  }

  // Public: website submission -> CRM lead (Inquiry)
  async submit(req, res) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
      const userAgent = req.headers['user-agent'];
      const result = await FormService.submit(req.params.identifier, req.body || {}, {
        ipAddress: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null
      });
      return successResponse(res, result.message, { redirectUrl: result.redirectUrl }, null, 201);
    } catch (error) {
      return handleError(res, error, 'Submit Form');
    }
  }
}

module.exports = new FormController();
