const TestimonialService = require('../services/TestimonialService');

class TestimonialController {
  async getAll(req, res, next) {
    try {
      const result = await TestimonialService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const testimonial = await TestimonialService.getById(req.params.id);
      res.json(testimonial);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const testimonial = await TestimonialService.create(req.body);
      res.status(201).json(testimonial);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const testimonial = await TestimonialService.update(req.params.id, req.body);
      res.json(testimonial);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await TestimonialService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestimonialController();
