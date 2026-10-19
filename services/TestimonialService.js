const BaseService = require('./BaseService');
const TestimonialRepository = require('../repositories/TestimonialRepository');

class TestimonialService extends BaseService {
  constructor() {
    super(TestimonialRepository);
  }
}

module.exports = new TestimonialService();
