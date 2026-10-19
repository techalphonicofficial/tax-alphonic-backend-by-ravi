const AuditLogService = require('../services/AuditLogService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class AuditLogController {
  async getAll(req, res) {
    try {
      const result = await AuditLogService.getAll(req.query);
      return successResponse(res, 'Audit logs retrieved successfully', result.data, result.pagination);
    } catch (error) {
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getFilters(req, res) {
    try {
      const filters = await AuditLogService.getFilters();
      return successResponse(res, 'Audit log filters retrieved successfully', filters);
    } catch (error) {
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getById(req, res) {
    try {
      const log = await AuditLogService.getById(req.params.id);
      return successResponse(res, 'Audit log retrieved successfully', log);
    } catch (error) {
      return errorResponse(res, error.message, [], 404);
    }
  }
}

module.exports = new AuditLogController();
