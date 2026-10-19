const BaseRepository = require('./BaseRepository');
const { PortfolioCategory } = require('../models');

class PortfolioCategoryRepository extends BaseRepository {
  constructor() {
    super(PortfolioCategory);
  }
}

module.exports = new PortfolioCategoryRepository();
