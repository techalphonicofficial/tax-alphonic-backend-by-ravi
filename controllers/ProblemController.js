const ProblemService = require('../services/ProblemService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class ProblemController {
  async create(req, res) {
    try {
      const item = await ProblemService.create(req.body);
      return successResponse(res, 'Problem created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create Problem Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await ProblemService.getAll(req.query);
      return successResponse(res, 'Problem retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Problem Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const item = await ProblemService.getById(req.params.id);
      return successResponse(res, 'Problem retrieved successfully', item);
    } catch (error) {
      logger.error(`Get Problem Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async update(req, res) {
    try {
      const item = await ProblemService.update(req.params.id, req.body);
      return successResponse(res, 'Problem updated successfully', item);
    } catch (error) {
      logger.error(`Update Problem Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      await ProblemService.delete(req.params.id);
      return successResponse(res, 'Problem deleted successfully');
    } catch (error) {
      logger.error(`Delete Problem Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new ProblemController();
