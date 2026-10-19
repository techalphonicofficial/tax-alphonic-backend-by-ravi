const BaseRepository = require('./BaseRepository');
const { Branch } = require('../models');

class BranchRepository extends BaseRepository {
  constructor() {
    super(Branch);
  }

  async getAll(options = {}) {
    const defaultOptions = {
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    };
    return await this.model.findAll({ ...defaultOptions, ...options });
  }
}

module.exports = new BranchRepository();
