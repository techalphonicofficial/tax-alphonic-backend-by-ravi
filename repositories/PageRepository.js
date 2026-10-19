const BaseRepository = require('./BaseRepository');
const { Page } = require('../models');

class PageRepository extends BaseRepository {
  constructor() {
    super(Page);
  }
}

module.exports = new PageRepository();
