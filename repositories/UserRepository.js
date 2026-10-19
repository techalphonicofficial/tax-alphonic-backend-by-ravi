const BaseRepository = require('./BaseRepository');
const { User, Role, Permission } = require('../models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findById(id) {
    return await this.model.findByPk(id, {
      include: [{ 
          model: Role, 
          as: 'role',
          include: [{ model: Permission, as: 'permissions' }]
      }]
    });
  }

  async findByEmail(email) {
    return await this.model.findOne({
      where: { email },
      include: [{ 
          model: Role, 
          as: 'role',
          include: [{ model: Permission, as: 'permissions' }]
      }]
    });
  }
}

module.exports = new UserRepository();
