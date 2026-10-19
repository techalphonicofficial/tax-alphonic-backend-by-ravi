const PortfolioItemService = require('../services/PortfolioItemService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class PortfolioItemController {
  async createItem(req, res) {
    try {
      const item = await PortfolioItemService.create(req.body);
      return successResponse(res, 'Portfolio item created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create Portfolio Item Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getItems(req, res) {
    try {
      const result = await PortfolioItemService.getAllItems(req.query);
      return successResponse(res, 'Portfolio items retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Portfolio Items Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getItemById(req, res) {
    try {
      const item = await PortfolioItemService.getById(req.params.id);
      return successResponse(res, 'Portfolio item retrieved successfully', item);
    } catch (error) {
      logger.error(`Get Portfolio Item Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async updateItem(req, res) {
    try {
      const item = await PortfolioItemService.update(req.params.id, req.body);
      return successResponse(res, 'Portfolio item updated successfully', item);
    } catch (error) {
      logger.error(`Update Portfolio Item Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteItem(req, res) {
    try {
      await PortfolioItemService.delete(req.params.id);
      return successResponse(res, 'Portfolio item deleted successfully');
    } catch (error) {
      logger.error(`Delete Portfolio Item Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new PortfolioItemController();
