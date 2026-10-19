class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data, transaction = null) {
    return await this.model.create(data, { transaction });
  }

  async findById(id) {
    return await this.model.findByPk(id);
  }

  async findOne(query) {
    return await this.model.findOne(query);
  }

  async findAll(query = {}) {
    return await this.model.findAll(query);
  }

  async findAndCountAll(query = {}) {
    return await this.model.findAndCountAll(query);
  }

  async update(id, data, transaction = null) {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    return await record.update(data, { transaction });
  }

  async delete(id, transaction = null) {
    const record = await this.model.findByPk(id);
    if (!record) return false;
    await record.destroy({ transaction });
    return true;
  }

  async restore(id) {
    const record = await this.model.findByPk(id, { paranoid: false });
    if (!record) return false;
    await record.restore();
    return true;
  }
}

module.exports = BaseRepository;
