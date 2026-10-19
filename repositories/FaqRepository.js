const BaseRepository = require('./BaseRepository');
const { Faq } = require('../models');

class FaqRepository extends BaseRepository {
  constructor() {
    super(Faq);
  }
}

module.exports = new FaqRepository();
