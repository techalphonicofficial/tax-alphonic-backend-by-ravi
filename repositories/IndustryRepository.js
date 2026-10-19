const BaseRepository = require('./BaseRepository');
const { Industry } = require('../models');

class IndustryRepository extends BaseRepository {
  constructor() {
    super(Industry);
  }
}

module.exports = new IndustryRepository();
