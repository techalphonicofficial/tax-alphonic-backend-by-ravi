const BaseService = require('./BaseService');
const SeoPageRepository = require('../repositories/SeoPageRepository');

class SeoPageService extends BaseService {
  constructor() {
    super(SeoPageRepository);
  }
}

module.exports = new SeoPageService();
