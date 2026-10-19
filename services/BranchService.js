const BranchRepository = require('../repositories/BranchRepository');
const BaseService = require('./BaseService');

class BranchService extends BaseService {
  constructor() {
    super(BranchRepository);
  }
}

module.exports = new BranchService();
