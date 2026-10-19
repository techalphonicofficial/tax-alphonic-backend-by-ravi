const CountryRepository = require('../repositories/CountryRepository');
const BaseService = require('./BaseService');

class CountryService extends BaseService {
  constructor() {
    super(CountryRepository);
  }
}

module.exports = new CountryService();
