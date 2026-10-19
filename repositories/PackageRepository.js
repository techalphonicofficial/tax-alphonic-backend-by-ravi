const BaseRepository = require('./BaseRepository');
const { Package } = require('../models');

class PackageRepository extends BaseRepository {
  constructor() {
    super(Package);
  }
}

module.exports = new PackageRepository();
