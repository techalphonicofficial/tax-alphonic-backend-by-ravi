const BaseService = require('./BaseService');
const IndustryRepository = require('../repositories/IndustryRepository');

class IndustryService extends BaseService {
  constructor() {
    super(IndustryRepository);
  }
}

module.exports = new IndustryService();
