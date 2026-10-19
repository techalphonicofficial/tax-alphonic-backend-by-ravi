const BranchService = require('../services/BranchService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class BranchController {
  async getAll(req, res) {
    try {
      const branches = await BranchService.getAll(req.query);
      return successResponse(res, 'Branches retrieved successfully', branches);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const branch = await BranchService.getById(req.params.id);
      if (!branch) return errorResponse(res, 'Branch not found', 404);
      return successResponse(res, 'Branch retrieved successfully', branch);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const branch = await BranchService.create(req.body);
      return successResponse(res, 'Branch created successfully', branch, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const branch = await BranchService.update(req.params.id, req.body);
      if (!branch) return errorResponse(res, 'Branch not found', 404);
      return successResponse(res, 'Branch updated successfully', branch);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const result = await BranchService.delete(req.params.id);
      if (!result) return errorResponse(res, 'Branch not found', 404);
      return successResponse(res, 'Branch deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new BranchController();
