const BaseService = require('./BaseService');
const MediaCategoryRepository = require('../repositories/MediaCategoryRepository');

class MediaCategoryService extends BaseService {
  constructor() {
    super(MediaCategoryRepository);
  }
}

module.exports = new MediaCategoryService();
