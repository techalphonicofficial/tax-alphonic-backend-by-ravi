const BaseService = require('./BaseService');
const PageRepository = require('../repositories/PageRepository');
const SectionHydrator = require('./SectionHydrator');

class PageService extends BaseService {
  constructor() {
    super(PageRepository);
  }

  async getBySlug(slug) {
    const page = await this.repository.findOne({ where: { slug, status: 'published' } });
    if (!page) throw new Error('Page not found');
    const data = page.toJSON();
    data.sections = await SectionHydrator.hydrateSections(data.sections || []);
    return data;
  }
}

module.exports = new PageService();
