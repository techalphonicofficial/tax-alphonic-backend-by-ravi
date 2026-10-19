const ServiceService = require('../services/ServiceService');
const SectionHydrator = require('../services/SectionHydrator');

class ServiceController {
  async getAll(req, res, next) {
    try {
      const result = await ServiceService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Return service with sections nested
      const service = await ServiceService.getServiceWithSections(req.params.id);
      res.json(service);
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const service = await ServiceService.getBySlug(req.params.slug);
      if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      const data = await SectionHydrator.hydrateServiceSections(service.toJSON());
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // Split core fields from section payload
      const { sections, ...coreData } = req.body;
      const service = await ServiceService.create(coreData);

      if (sections) {
        await ServiceService.saveServiceSections(service.id, sections);
      }

      const newService = await ServiceService.getServiceWithSections(service.id);
      res.status(201).json(newService);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { sections, ...coreData } = req.body;
      const service = await ServiceService.update(req.params.id, coreData);

      if (sections) {
        await ServiceService.saveServiceSections(service.id, sections);
      }

      const updatedService = await ServiceService.getServiceWithSections(service.id);
      res.json(updatedService);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await ServiceService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceController();
