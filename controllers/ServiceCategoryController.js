const ServiceCategoryService = require('../services/ServiceCategoryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class ServiceCategoryController {
  async createCategory(req, res) {
    try {
      const category = await ServiceCategoryService.create(req.body);
      return successResponse(res, 'Service category created successfully', category, null, 201);
    } catch (error) {
      logger.error(`Create Service Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getCategories(req, res) {
    try {
      // Using our custom method that populates parent and children
      const result = await ServiceCategoryService.getAllCategories(req.query);
      return successResponse(res, 'Service categories retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Service Categories Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getCategoryById(req, res) {
    try {
      const category = await ServiceCategoryService.getById(req.params.id);
      return successResponse(res, 'Service category retrieved successfully', category);
    } catch (error) {
      logger.error(`Get Service Category Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async updateCategory(req, res) {
    try {
      if (req.params.id === req.body.parentId) {
        return errorResponse(res, 'A category cannot be its own parent', [], 400);
      }
      const category = await ServiceCategoryService.update(req.params.id, req.body);
      return successResponse(res, 'Service category updated successfully', category);
    } catch (error) {
      logger.error(`Update Service Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteCategory(req, res) {
    try {
      // Per Option 2: Set to Null (keep children, remove parent association)
      const { ServiceCategory } = require('../models');
      await ServiceCategory.update({ parentId: null }, { where: { parentId: req.params.id } });
      
      await ServiceCategoryService.delete(req.params.id);
      return successResponse(res, 'Service category deleted successfully');
    } catch (error) {
      logger.error(`Delete Service Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new ServiceCategoryController();
