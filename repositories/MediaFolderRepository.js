const BaseRepository = require('./BaseRepository');
const { MediaFolder } = require('../models');

class MediaFolderRepository extends BaseRepository {
  constructor() {
    super(MediaFolder);
  }
}

module.exports = new MediaFolderRepository();
