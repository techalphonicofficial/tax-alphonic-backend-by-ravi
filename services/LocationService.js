const BaseService = require('./BaseService');
const LocationRepository = require('../repositories/LocationRepository');

class LocationService extends BaseService {
  constructor() {
    super(LocationRepository);
  }
}

module.exports = new LocationService();
