const PageCategoryService = require('../services/PageCategoryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class PageCategoryController {
  async getAll(req, res) {
    try {
      const categories = await PageCategoryService.getAll(req.query);
      return successResponse(res, 'Page categories retrieved successfully', categories);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const category = await PageCategoryService.getById(req.params.id);
      return successResponse(res, 'Page category retrieved successfully', category);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async create(req, res) {
    try {
      const category = await PageCategoryService.create(req.body);
      return successResponse(res, 'Page category created successfully', category, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const category = await PageCategoryService.update(req.params.id, req.body);
      return successResponse(res, 'Page category updated successfully', category);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await PageCategoryService.delete(req.params.id);
      return successResponse(res, 'Page category deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new PageCategoryController();
