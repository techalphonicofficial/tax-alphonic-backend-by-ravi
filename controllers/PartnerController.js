const PartnerService = require('../services/PartnerService');
// Files uploaded with the form go to the active media storage (Media → Media Settings).
const StorageService = require('../services/storage/StorageService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const path = require('path');
const fs = require('fs');

class PartnerController {
  async getAll(req, res) {
    try {
      const partners = await PartnerService.getAll(req.query);
      return successResponse(res, 'Partners retrieved successfully', partners);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const partner = await PartnerService.getById(req.params.id);
      return successResponse(res, 'Partner retrieved successfully', partner);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async create(req, res) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.logoUrl = await StorageService.storeDiskUpload(req.file);
      }
      const partner = await PartnerService.create(data);
      return successResponse(res, 'Partner created successfully', partner, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const data = { ...req.body };
      if (req.file) {
        // Remove old logo
        const existing = await PartnerService.getById(req.params.id);
        if (existing.logoUrl) {
          const oldPath = path.join(__dirname, '..', 'public', existing.logoUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        data.logoUrl = await StorageService.storeDiskUpload(req.file);
      }
      const partner = await PartnerService.update(req.params.id, data);
      return successResponse(res, 'Partner updated successfully', partner);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await PartnerService.delete(req.params.id);
      return successResponse(res, 'Partner deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new PartnerController();
