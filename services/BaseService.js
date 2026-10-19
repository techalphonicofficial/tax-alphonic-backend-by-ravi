const { Op } = require('sequelize');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async create(data, transaction = null) {
    return await this.repository.create(data, transaction);
  }

  async getById(id) {
    const record = await this.repository.findById(id);
    if (!record) throw new Error('Record not found');
    return record;
  }

  async getAll(reqQuery = {}, options = {}) {
    // Basic pagination and sorting logic
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', ...filters } = reqQuery;
    const offset = (page - 1) * limit;

    const where = {};
    for (const key in filters) {
      if (key.endsWith('_like')) {
        const field = key.replace('_like', '');
        where[field] = { [Op.like]: `%${filters[key]}%` };
      } else if (key.endsWith('_ne')) {
        const field = key.replace('_ne', '');
        where[field] = { [Op.ne]: filters[key] };
      } else {
        where[key] = filters[key];
      }
    }

    const query = {
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[sortBy, sortOrder.toUpperCase()]],
      ...options
    };

    const result = await this.repository.findAndCountAll(query);
    
    return {
      data: result.rows,
      pagination: {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limit),
        currentPage: parseInt(page, 10),
        itemsPerPage: parseInt(limit, 10),
      }
    };
  }

  async update(id, data, transaction = null) {
    const record = await this.repository.update(id, data, transaction);
    if (!record) throw new Error('Record not found');
    return record;
  }

  async delete(id, transaction = null) {
    const success = await this.repository.delete(id, transaction);
    if (!success) throw new Error('Record not found');
    return success;
  }
}

module.exports = BaseService;
