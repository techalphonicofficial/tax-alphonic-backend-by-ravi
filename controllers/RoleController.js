const RoleService = require('../services/RoleService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class RoleController {
  async getAll(req, res) {
    try {
      const roles = await RoleService.getAll(req.query);
      return successResponse(res, 'Roles retrieved successfully', roles);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const role = await RoleService.getById(req.params.id);
      if (!role) return errorResponse(res, 'Role not found', 404);
      return successResponse(res, 'Role retrieved successfully', role);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const role = await RoleService.create(req.body);
      if (req.body.permissions) {
          await RoleService.assignPermissions(role.id, req.body.permissions);
      }
      return successResponse(res, 'Role created successfully', role, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const role = await RoleService.update(req.params.id, req.body);
      if (!role) return errorResponse(res, 'Role not found', 404);
      
      if (req.body.permissions) {
          await RoleService.assignPermissions(role.id, req.body.permissions);
      }
      return successResponse(res, 'Role updated successfully', role);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      // Super Admin protection
      const role = await RoleService.getById(req.params.id);
      if (role && role.name === 'Admin') {
          return errorResponse(res, 'Cannot delete Admin role', 403);
      }

      const result = await RoleService.delete(req.params.id);
      if (!result) return errorResponse(res, 'Role not found', 404);
      return successResponse(res, 'Role deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new RoleController();
