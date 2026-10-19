const LocationService = require('../services/LocationService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class LocationController {
  async create(req, res) {
    try {
      const item = await LocationService.create(req.body);
      return successResponse(res, 'Location created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create Location Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await LocationService.getAll(req.query);
      return successResponse(res, 'Location retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Location Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const item = await LocationService.getById(req.params.id);
      return successResponse(res, 'Location retrieved successfully', item);
    } catch (error) {
      logger.error(`Get Location Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async update(req, res) {
    try {
      const item = await LocationService.update(req.params.id, req.body);
      return successResponse(res, 'Location updated successfully', item);
    } catch (error) {
      logger.error(`Update Location Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      await LocationService.delete(req.params.id);
      return successResponse(res, 'Location deleted successfully');
    } catch (error) {
      logger.error(`Delete Location Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new LocationController();
