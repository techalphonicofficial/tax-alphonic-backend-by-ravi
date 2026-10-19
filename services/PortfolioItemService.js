const BaseService = require('./BaseService');
const PortfolioItemRepository = require('../repositories/PortfolioItemRepository');
const { PortfolioCategory } = require('../models');

class PortfolioItemService extends BaseService {
  constructor() {
    super(PortfolioItemRepository);
  }

  async getAllItems(reqQuery = {}) {
    return super.getAll(reqQuery, {
      include: [
        {
          model: PortfolioCategory,
          as: 'category',
          attributes: ['id', 'name'],
          include: [
            {
              model: PortfolioCategory,
              as: 'parent',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
  }
}

module.exports = new PortfolioItemService();
