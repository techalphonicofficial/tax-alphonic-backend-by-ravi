const BaseRepository = require('./BaseRepository');
const { Location, State } = require('../models');

class LocationRepository extends BaseRepository {
  constructor() {
    super(Location);
  }

  // Lists carry the state name (admin Locations list shows and filters by it).
  async findAndCountAll(query = {}) {
    const include = [{ model: State, as: 'stateMaster', attributes: ['id', 'name', 'slug'] }];
    return super.findAndCountAll({ ...query, include: query.include ? [...query.include, ...include] : include, distinct: true });
  }
}

module.exports = new LocationRepository();
