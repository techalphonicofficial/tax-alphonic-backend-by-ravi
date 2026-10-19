const BaseRepository = require('./BaseRepository');
const { Menu, MenuItem } = require('../models');

class MenuRepository extends BaseRepository {
  constructor() {
    super(Menu);
  }

  // Override to always include items nested
  async findById(id) {
    return this.model.findByPk(id, {
      include: [
        {
          model: MenuItem,
          as: 'items',
          required: false,
          where: { parentId: null }, // Top level items
          include: [
            {
              model: MenuItem,
              as: 'children',
              required: false,
              include: [{ model: MenuItem, as: 'children', required: false }]
            }
          ]
        }
      ]
    });
  }

  // Override to include items globally for pagination fetching
  async findAndCountAll(query) {
    query.include = [
      {
        model: MenuItem,
        as: 'items',
        required: false,
        where: { parentId: null },
        include: [
          {
            model: MenuItem,
            as: 'children',
            required: false,
            include: [{ model: MenuItem, as: 'children', required: false }]
          }
        ]
      }
    ];
    query.distinct = true; // Prevents count mismatch due to joins
    // We cannot push deep ordering in root query easily without specifying models array, so sorting will be done via client or specific hooks
    return this.model.findAndCountAll(query);
  }
}

module.exports = new MenuRepository();
