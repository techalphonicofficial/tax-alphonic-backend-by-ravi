const UserService = require('../services/UserService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class UserController {
  async getAll(req, res) {
    try {
      const users = await UserService.getAll(req.query, { include: ['role'] });
      return successResponse(res, 'Users retrieved successfully', users);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const user = await UserService.getById(req.params.id);
      if (!user) return errorResponse(res, 'User not found', 404);
      return successResponse(res, 'User retrieved successfully', user);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const user = await UserService.create(req.body);
      return successResponse(res, 'User created successfully', user, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const user = await UserService.update(req.params.id, req.body);
      if (!user) return errorResponse(res, 'User not found', 404);
      return successResponse(res, 'User updated successfully', user);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const result = await UserService.delete(req.params.id);
      if (!result) return errorResponse(res, 'User not found', 404);
      return successResponse(res, 'User deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new UserController();
