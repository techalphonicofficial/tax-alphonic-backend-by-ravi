const BaseRepository = require('./BaseRepository');
const { Country } = require('../models');

class CountryRepository extends BaseRepository {
  constructor() {
    super(Country);
  }
}

module.exports = new CountryRepository();
