const PageCategoryRepository = require('../repositories/PageCategoryRepository');
const BaseService = require('./BaseService');

class PageCategoryService extends BaseService {
  constructor() {
    super(PageCategoryRepository);
  }
}

module.exports = new PageCategoryService();
