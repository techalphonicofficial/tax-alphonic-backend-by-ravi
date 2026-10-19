const BaseRepository = require('./BaseRepository');
const { MenuItem } = require('../models');

class MenuItemRepository extends BaseRepository {
  constructor() {
    super(MenuItem);
  }

  async deleteByMenuId(menuId) {
    return this.model.destroy({ where: { menuId } });
  }
}

module.exports = new MenuItemRepository();
