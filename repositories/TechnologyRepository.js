const BaseRepository = require('./BaseRepository');
const { Technology } = require('../models');

class TechnologyRepository extends BaseRepository {
  constructor() {
    super(Technology);
  }
}

module.exports = new TechnologyRepository();
