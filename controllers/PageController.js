const PageService = require('../services/PageService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class PageController {
  async createPage(req, res) {
    try {
      const page = await PageService.create(req.body);
      return successResponse(res, 'Page created successfully', page, null, 201);
    } catch (error) {
      logger.error(`Create Page Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  // POST /pages/:id/clone → a draft copy (PageService.clone).
  async clonePage(req, res) {
    try {
      const page = await PageService.clone(req.params.id);
      return successResponse(res, `Draft copy "${page.title}" created`, page, null, 201);
    } catch (error) {
      logger.error(`Clone Page Error: ${error.message}`);
      return errorResponse(res, error.message, error.errors || [], error.status || 400);
    }
  }

  async getPages(req, res) {
    try {
      const { data, pagination } = await PageService.getAll(req.query);
      return successResponse(res, 'Pages retrieved successfully', data, pagination);
    } catch (error) {
      logger.error(`Get Pages Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getPageById(req, res) {
    try {
      const page = await PageService.getById(req.params.id);
      return successResponse(res, 'Page retrieved successfully', page);
    } catch (error) {
      logger.error(`Get Page Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  // Public: the Journey Stage pages (see PageService.getJourneyStages).
  async getJourneyStages(req, res) {
    try {
      const stages = await PageService.getJourneyStages();
      return successResponse(res, 'Journey stages retrieved successfully', stages);
    } catch (error) {
      logger.error(`Get Journey Stages Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  // Public: the free tool pages (see PageService.getTools).
  async getTools(req, res) {
    try {
      const tools = await PageService.getTools();
      return successResponse(res, 'Tools retrieved successfully', tools);
    } catch (error) {
      logger.error(`Get Tools Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getPageBySlug(req, res) {
    try {
      const page = await PageService.getBySlug(req.params.slug);
      return successResponse(res, 'Page retrieved successfully', page);
    } catch (error) {
      logger.error(`Get Page by Slug Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async updatePage(req, res) {
    try {
      const page = await PageService.update(req.params.id, req.body);
      return successResponse(res, 'Page updated successfully', page);
    } catch (error) {
      logger.error(`Update Page Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async deletePage(req, res) {
    try {
      await PageService.delete(req.params.id);
      return successResponse(res, 'Page deleted successfully');
    } catch (error) {
      logger.error(`Delete Page Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new PageController();
