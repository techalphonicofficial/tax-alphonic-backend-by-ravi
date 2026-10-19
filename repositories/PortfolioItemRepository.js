const BaseRepository = require('./BaseRepository');
const { PortfolioItem } = require('../models');

class PortfolioItemRepository extends BaseRepository {
  constructor() {
    super(PortfolioItem);
  }
}

module.exports = new PortfolioItemRepository();
