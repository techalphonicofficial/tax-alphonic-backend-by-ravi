const BaseRepository = require('./BaseRepository');
const { LandingPage } = require('../models');

class LandingPageRepository extends BaseRepository {
  constructor() {
    super(LandingPage);
  }
}

module.exports = new LandingPageRepository();
