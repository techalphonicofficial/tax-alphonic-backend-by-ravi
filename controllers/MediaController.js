const MediaService = require('../services/MediaService');
const MediaFolderService = require('../services/MediaFolderService');
const MediaCategoryService = require('../services/MediaCategoryService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class MediaController {
  // === MEDIA FILES ===
  async uploadMedia(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded', [], 400);
      }
      
      const media = await MediaService.processAndUpload(req.file, req.body);
      return successResponse(res, 'Media uploaded successfully', media, null, 201);
    } catch (error) {
      logger.error(`Upload Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async uploadBulkMedia(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return errorResponse(res, 'No files uploaded', [], 400);
      }
      
      // Each file on its own: one bad file no longer fails (or hides) the ones already saved.
      // data = the saved files, errors = [{ field: <file name>, message }] for the rest.
      const mediaItems = [];
      const errors = [];
      for (const file of req.files) {
        try {
          mediaItems.push(await MediaService.processAndUpload(file, req.body));
        } catch (error) {
          logger.error(`Upload Bulk Media Error (${file.originalname}): ${error.message}`);
          errors.push({ field: file.originalname, message: error.message });
        }
      }
      if (!mediaItems.length) {
        return errorResponse(res, errors.length === 1 ? `${errors[0].field}: ${errors[0].message}` : 'None of the files could be uploaded', errors, 422);
      }
      return res.status(201).json({
        success: true,
        message: errors.length ? `Uploaded ${mediaItems.length} of ${req.files.length} files` : 'Bulk media uploaded successfully',
        data: mediaItems,
        errors,
      });
    } catch (error) {
      logger.error(`Upload Bulk Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getMedia(req, res) {
    try {
      const { data, pagination } = await MediaService.getAll(req.query);
      return successResponse(res, 'Media retrieved successfully', data, pagination);
    } catch (error) {
      logger.error(`Get Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getMediaById(req, res) {
    try {
      const media = await MediaService.getById(req.params.id);
      return successResponse(res, 'Media retrieved successfully', media);
    } catch (error) {
      logger.error(`Get Media Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async updateMedia(req, res) {
    try {
      const media = await MediaService.update(req.params.id, req.body);
      return successResponse(res, 'Media updated successfully', media);
    } catch (error) {
      logger.error(`Update Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteMedia(req, res) {
    try {
      await MediaService.delete(req.params.id);
      return successResponse(res, 'Media moved to trash successfully');
    } catch (error) {
      logger.error(`Delete Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
  
  async restoreMedia(req, res) {
    try {
      await MediaService.restore(req.params.id);
      return successResponse(res, 'Media restored successfully');
    } catch (error) {
      logger.error(`Restore Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async forceDeleteMedia(req, res) {
    try {
      await MediaService.forceDelete(req.params.id);
      return successResponse(res, 'Media permanently deleted');
    } catch (error) {
      logger.error(`Force Delete Media Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  // === MEDIA FOLDERS ===
  async createFolder(req, res) {
    try {
      const folder = await MediaFolderService.create(req.body);
      return successResponse(res, 'Folder created', folder, null, 201);
    } catch (error) {
      logger.error(`Create Folder Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getFolders(req, res) {
    try {
      const { data, pagination } = await MediaFolderService.getAll(req.query);
      return successResponse(res, 'Folders retrieved', data, pagination);
    } catch (error) {
      logger.error(`Get Folders Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async updateFolder(req, res) {
    try {
      const folder = await MediaFolderService.update(req.params.id, req.body);
      return successResponse(res, 'Folder updated', folder);
    } catch (error) {
      logger.error(`Update Folder Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteFolder(req, res) {
    try {
      await MediaFolderService.delete(req.params.id);
      return successResponse(res, 'Folder moved to trash');
    } catch (error) {
      logger.error(`Delete Folder Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
  
  // === MEDIA CATEGORIES ===
  async createCategory(req, res) {
    try {
      const category = await MediaCategoryService.create(req.body);
      return successResponse(res, 'Category created', category, null, 201);
    } catch (error) {
      logger.error(`Create Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getCategories(req, res) {
    try {
      const { data, pagination } = await MediaCategoryService.getAll(req.query);
      return successResponse(res, 'Categories retrieved', data, pagination);
    } catch (error) {
      logger.error(`Get Categories Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deleteCategory(req, res) {
    try {
      await MediaCategoryService.delete(req.params.id);
      return successResponse(res, 'Category deleted');
    } catch (error) {
      logger.error(`Delete Category Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new MediaController();
