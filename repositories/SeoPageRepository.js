const BaseRepository = require('./BaseRepository');
const { Seopage: SeoPage } = require('../models');

class SeoPageRepository extends BaseRepository {
  constructor() {
    super(SeoPage);
  }
}

module.exports = new SeoPageRepository();
