const InquiryService = require('../services/InquiryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class InquiryController {
  async create(req, res) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
      const userAgent = req.headers['user-agent'];

      const payload = {
        ...req.body,
        ipAddress: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null
      };

      const item = await InquiryService.create(payload);
      return successResponse(res, 'Thank you! Your message has been submitted successfully.', item, null, 201);
    } catch (error) {
      logger.error(`Create Inquiry Error: ${error.message}`);
      return errorResponse(res, error.message, [], 400);
    }
  }

  async getAll(req, res) {
    try {
      const result = await InquiryService.getAll(req.query);
      return successResponse(res, 'Inquiries retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get Inquiries Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await InquiryService.getStats();
      return successResponse(res, 'Lead stats retrieved successfully', stats);
    } catch (error) {
      logger.error(`Get Inquiry Stats Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getById(req, res) {
    try {
      const item = await InquiryService.getById(req.params.id);
      return successResponse(res, 'Inquiry details retrieved', item);
    } catch (error) {
      logger.error(`Get Inquiry By ID Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async update(req, res) {
    try {
      const item = await InquiryService.update(req.params.id, req.body);
      return successResponse(res, 'Inquiry updated successfully', item);
    } catch (error) {
      logger.error(`Update Inquiry Error: ${error.message}`);
      return errorResponse(res, error.message, [], 400);
    }
  }

  async delete(req, res) {
    try {
      await InquiryService.delete(req.params.id);
      return successResponse(res, 'Inquiry deleted successfully');
    } catch (error) {
      logger.error(`Delete Inquiry Error: ${error.message}`);
      return errorResponse(res, error.message, [], 400);
    }
  }
}

module.exports = new InquiryController();
