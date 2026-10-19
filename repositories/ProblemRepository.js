const BaseRepository = require('./BaseRepository');
const { Problem } = require('../models');

class ProblemRepository extends BaseRepository {
  constructor() {
    super(Problem);
  }
}

module.exports = new ProblemRepository();
