const BaseRepository = require('./BaseRepository');
const { Permission } = require('../models');

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }

  async findByActionAndModule(action, module) {
    return await this.model.findOne({
      where: { action, module }
    });
  }
}

module.exports = new PermissionRepository();
