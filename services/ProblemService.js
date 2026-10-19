const BaseService = require('./BaseService');
const ProblemRepository = require('../repositories/ProblemRepository');

class ProblemService extends BaseService {
  constructor() {
    super(ProblemRepository);
  }
}

module.exports = new ProblemService();
