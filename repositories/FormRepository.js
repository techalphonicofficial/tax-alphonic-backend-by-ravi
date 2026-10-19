const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Form } = require('../models');

class FormRepository extends BaseRepository {
  constructor() {
    super(Form);
  }

  async findActiveByIdOrSlug(identifier) {
    return await this.model.findOne({
      where: {
        [Op.or]: [{ id: identifier }, { slug: identifier }],
        status: 'active'
      }
    });
  }

  // Unique index covers soft-deleted rows too, so check with paranoid: false
  async slugExists(slug, excludeId = null) {
    const where = { slug };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const count = await this.model.count({ where, paranoid: false });
    return count > 0;
  }
}

module.exports = new FormRepository();
