const TechnologyService = require('../services/TechnologyService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class TechnologyController {
  async create(req, res) {
    try {
      const item = await TechnologyService.create(req.body);
      return successResponse(res, 'Technology created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create Technology Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await TechnologyService.getAll(req.query);
      return successResponse(res, 'Technology retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Technology Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const item = await TechnologyService.getById(req.params.id);
      return successResponse(res, 'Technology retrieved successfully', item);
    } catch (error) {
      logger.error(`Get Technology Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async update(req, res) {
    try {
      const item = await TechnologyService.update(req.params.id, req.body);
      return successResponse(res, 'Technology updated successfully', item);
    } catch (error) {
      logger.error(`Update Technology Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      await TechnologyService.delete(req.params.id);
      return successResponse(res, 'Technology deleted successfully');
    } catch (error) {
      logger.error(`Delete Technology Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new TechnologyController();
