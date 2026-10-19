const BaseRepository = require('./BaseRepository');
const { MediaCategory } = require('../models');

class MediaCategoryRepository extends BaseRepository {
  constructor() {
    super(MediaCategory);
  }
}

module.exports = new MediaCategoryRepository();
