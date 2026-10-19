const PermissionService = require('../services/PermissionService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class PermissionController {
  async getAll(req, res) {
    try {
      const permissions = await PermissionService.getAll(req.query);
      return successResponse(res, 'Permissions retrieved successfully', permissions);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const permission = await PermissionService.getById(req.params.id);
      if (!permission) return errorResponse(res, 'Permission not found', 404);
      return successResponse(res, 'Permission retrieved successfully', permission);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const permission = await PermissionService.create(req.body);
      return successResponse(res, 'Permission created successfully', permission, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const permission = await PermissionService.update(req.params.id, req.body);
      if (!permission) return errorResponse(res, 'Permission not found', 404);
      return successResponse(res, 'Permission updated successfully', permission);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const result = await PermissionService.delete(req.params.id);
      if (!result) return errorResponse(res, 'Permission not found', 404);
      return successResponse(res, 'Permission deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new PermissionController();
