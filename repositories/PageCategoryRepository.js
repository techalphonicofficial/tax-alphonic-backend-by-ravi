const BaseRepository = require('./BaseRepository');
const { PageCategory } = require('../models');

class PageCategoryRepository extends BaseRepository {
  constructor() {
    super(PageCategory);
  }
}

module.exports = new PageCategoryRepository();
