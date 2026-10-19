const BaseRepository = require('./BaseRepository');
const { Service } = require('../models');

class ServiceRepository extends BaseRepository {
  constructor() {
    super(Service);
  }
}

module.exports = new ServiceRepository();
