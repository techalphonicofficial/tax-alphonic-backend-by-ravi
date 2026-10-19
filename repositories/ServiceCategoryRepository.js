const BaseRepository = require('./BaseRepository');
const { ServiceCategory } = require('../models');

class ServiceCategoryRepository extends BaseRepository {
  constructor() {
    super(ServiceCategory);
  }
}

module.exports = new ServiceCategoryRepository();
