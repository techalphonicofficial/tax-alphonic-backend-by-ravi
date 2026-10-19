const BaseRepository = require('./BaseRepository');
const { AuditLog, User } = require('../models');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async getAll(options = {}) {
    const defaultOptions = {
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        order: [['createdAt', 'DESC']]
    };
    return await this.model.findAll({ ...defaultOptions, ...options });
  }
}

module.exports = new AuditLogRepository();
