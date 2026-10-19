const IndustryService = require('../services/IndustryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class IndustryController {
  async create(req, res) {
    try {
      const item = await IndustryService.create(req.body);
      return successResponse(res, 'Industry created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create Industry Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await IndustryService.getAll(req.query);
      return successResponse(res, 'Industry retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Industry Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const item = await IndustryService.getById(req.params.id);
      return successResponse(res, 'Industry retrieved successfully', item);
    } catch (error) {
      logger.error(`Get Industry Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async update(req, res) {
    try {
      const item = await IndustryService.update(req.params.id, req.body);
      return successResponse(res, 'Industry updated successfully', item);
    } catch (error) {
      logger.error(`Update Industry Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      await IndustryService.delete(req.params.id);
      return successResponse(res, 'Industry deleted successfully');
    } catch (error) {
      logger.error(`Delete Industry Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new IndustryController();
