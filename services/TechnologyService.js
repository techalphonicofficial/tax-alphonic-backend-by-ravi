const BaseService = require('./BaseService');
const TechnologyRepository = require('../repositories/TechnologyRepository');

class TechnologyService extends BaseService {
  constructor() {
    super(TechnologyRepository);
  }
}

module.exports = new TechnologyService();
