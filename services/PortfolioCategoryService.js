const BaseService = require('./BaseService');
const PortfolioCategoryRepository = require('../repositories/PortfolioCategoryRepository');

class PortfolioCategoryService extends BaseService {
  constructor() {
    super(PortfolioCategoryRepository);
  }
}

module.exports = new PortfolioCategoryService();
