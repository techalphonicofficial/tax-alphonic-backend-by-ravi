const BaseRepository = require('./BaseRepository');
const { Testimonial } = require('../models');

class TestimonialRepository extends BaseRepository {
  constructor() {
    super(Testimonial);
  }
}

module.exports = new TestimonialRepository();
