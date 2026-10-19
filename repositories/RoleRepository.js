const BaseRepository = require('./BaseRepository');
const { Role, Permission } = require('../models');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return await this.model.findOne({
      where: { name },
      include: [{ model: Permission, as: 'permissions' }]
    });
  }

  async findByIdWithPermissions(id) {
    return await this.model.findByPk(id, {
      include: [{ model: Permission, as: 'permissions' }]
    });
  }
}

module.exports = new RoleRepository();
