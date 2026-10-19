const CountryService = require('../services/CountryService');
// Files uploaded with the form go to the active media storage (Media → Media Settings).
const StorageService = require('../services/storage/StorageService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const path = require('path');
const fs = require('fs');

class CountryController {
  async getAll(req, res) {
    try {
      const countries = await CountryService.getAll(req.query);
      return successResponse(res, 'Countries retrieved successfully', countries);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const country = await CountryService.getById(req.params.id);
      return successResponse(res, 'Country retrieved successfully', country);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async create(req, res) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.flagUrl = await StorageService.storeDiskUpload(req.file);
      }
      const country = await CountryService.create(data);
      return successResponse(res, 'Country created successfully', country, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const data = { ...req.body };
      if (req.file) {
        // Remove old flag
        const existing = await CountryService.getById(req.params.id);
        if (existing.flagUrl) {
          const oldPath = path.join(__dirname, '..', 'public', existing.flagUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        data.flagUrl = await StorageService.storeDiskUpload(req.file);
      }
      const country = await CountryService.update(req.params.id, data);
      return successResponse(res, 'Country updated successfully', country);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await CountryService.delete(req.params.id);
      return successResponse(res, 'Country deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new CountryController();
