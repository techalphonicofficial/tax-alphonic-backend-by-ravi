const PermissionRepository = require('../repositories/PermissionRepository');
const BaseService = require('./BaseService');

class PermissionService extends BaseService {
  constructor() {
    super(PermissionRepository);
  }

  async findByActionAndModule(action, module) {
    return await this.repository.findByActionAndModule(action, module);
  }
}

module.exports = new PermissionService();
