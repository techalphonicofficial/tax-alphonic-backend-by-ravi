const path = require('path');
const fs = require('fs');
const SystemLogService = require('../services/SystemLogService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class SystemLogController {
  async getEntries(req, res) {
    try {
      const result = await SystemLogService.getEntries(req.params.type, req.query);
      return res.status(200).json({
        success: true,
        message: 'Log entries retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        summary: result.summary,
        errors: []
      });
    } catch (error) {
      return errorResponse(res, error.message, [], error.statusCode || 500);
    }
  }

  async download(req, res) {
    try {
      const file = SystemLogService.resolveFile(req.params.type);
      if (!fs.existsSync(file)) return errorResponse(res, 'Log file is empty', [], 404);
      const date = new Date().toISOString().slice(0, 10);
      return res.download(file, `${path.basename(file, '.txt')}-${date}.txt`);
    } catch (error) {
      return errorResponse(res, error.message, [], error.statusCode || 500);
    }
  }

  async clear(req, res) {
    try {
      await SystemLogService.clear(req.params.type);
      return successResponse(res, 'Log file cleared successfully');
    } catch (error) {
      return errorResponse(res, error.message, [], error.statusCode || 500);
    }
  }
}

module.exports = new SystemLogController();
