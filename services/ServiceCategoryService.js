const BaseService = require('./BaseService');
const ServiceCategoryRepository = require('../repositories/ServiceCategoryRepository');
const { ServiceCategory } = require('../models');

class ServiceCategoryService extends BaseService {
  constructor() {
    super(ServiceCategoryRepository);
  }

  async getAllCategories(reqQuery = {}) {
    return super.getAll(reqQuery, {
      include: [
        {
          model: ServiceCategory,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: ServiceCategory,
          as: 'children',
          attributes: ['id', 'name']
        }
      ]
    });
  }
}

module.exports = new ServiceCategoryService();
