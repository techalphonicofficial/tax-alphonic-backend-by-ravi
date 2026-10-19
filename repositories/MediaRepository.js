const BaseRepository = require('./BaseRepository');
const { Media } = require('../models');

class MediaRepository extends BaseRepository {
  constructor() {
    super(Media);
  }
}

module.exports = new MediaRepository();
