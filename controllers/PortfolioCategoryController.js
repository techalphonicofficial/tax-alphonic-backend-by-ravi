const PortfolioCategoryService = require('../services/PortfolioCategoryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class PortfolioCategoryController {
  async createCategory(req, res) {
    try {
      const category = await PortfolioCategoryService.create(req.body);
      return successResponse(res, 'Portfolio category created successfully', category, null, 201);
    } catch (error) {
      logger.error(`Create Portfolio Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getCategories(req, res) {
    try {
      const result = await PortfolioCategoryService.getAll(req.query, {
        include: ['parent', 'children']
      });
      return successResponse(res, 'Portfolio categories retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Portfolio Categories Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getCategoryById(req, res) {
    try {
      const category = await PortfolioCategoryService.getById(req.params.id);
      return successResponse(res, 'Portfolio category retrieved successfully', category);
    } catch (error) {
      logger.error(`Get Portfolio Category Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await PortfolioCategoryService.update(req.params.id, req.body);
      return successResponse(res, 'Portfolio category updated successfully', category);
    } catch (error) {
      logger.error(`Update Portfolio Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { PortfolioItem } = require('../models');
      await PortfolioItem.update({ categoryId: null }, { where: { categoryId: req.params.id } });

      await PortfolioCategoryService.delete(req.params.id);
      return successResponse(res, 'Portfolio category deleted successfully');
    } catch (error) {
      logger.error(`Delete Portfolio Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new PortfolioCategoryController();
