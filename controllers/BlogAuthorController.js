const { BlogAuthor } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class BlogAuthorController {
  async getAll(req, res) {
    try {
      const data = await BlogAuthor.findAll();
      return successResponse(res, 'Fetched successfully', data);
    } catch (error) {
      logger.error('Error fetching ' + 'BlogAuthor: ' + error.message);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const data = await BlogAuthor.findByPk(req.params.id);
      if (!data) return errorResponse(res, 'Not found', [], 404);
      return successResponse(res, 'Fetched successfully', data);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async create(req, res) {
    try {
      const data = await BlogAuthor.create(req.body);
      return successResponse(res, 'Created successfully', data, null, 201);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async update(req, res) {
    try {
      const data = await BlogAuthor.findByPk(req.params.id);
      if (!data) return errorResponse(res, 'Not found', [], 404);
      await data.update(req.body);
      return successResponse(res, 'Updated successfully', data);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      const data = await BlogAuthor.findByPk(req.params.id);
      if (!data) return errorResponse(res, 'Not found', [], 404);
      await data.destroy();
      return successResponse(res, 'Deleted successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}
module.exports = new BlogAuthorController();