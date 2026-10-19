const BaseRepository = require('./BaseRepository');
const { Partner } = require('../models');

class PartnerRepository extends BaseRepository {
  constructor() {
    super(Partner);
  }
}

module.exports = new PartnerRepository();
