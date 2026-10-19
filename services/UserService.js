const UserRepository = require('../repositories/UserRepository');
const BaseService = require('./BaseService');

class UserService extends BaseService {
  constructor() {
    super(UserRepository);
  }

  async findByEmail(email) {
    return await this.repository.findByEmail(email);
  }
}

module.exports = new UserService();
