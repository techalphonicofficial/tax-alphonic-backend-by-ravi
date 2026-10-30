const { Op } = require('sequelize');
const BaseService = require('./BaseService');
const PageRepository = require('../repositories/PageRepository');
const SectionHydrator = require('./SectionHydrator');
const { copyFields, copyTitle, freeCopySlug } = require('./cloneRecord');

// Draft pages behind Landing Pages (LandingPageService): edited and published only through
// /landing-pages, so the normal page list, public routes, publish and delete leave them alone.
const LANDING_PREFIX = 'landing-page/';
const isLandingSlug = (slug) => String(slug || '').startsWith(LANDING_PREFIX);

class PageService extends BaseService {
  constructor() {
    super(PageRepository);
  }

  /** Normal pages only (landing page drafts hidden). */
  async getAll(reqQuery = {}, options = {}) {
    const hide = { slug: { [Op.notLike]: `${LANDING_PREFIX}%` } };
    const repository = this.repository;
    const filtered = { findAndCountAll: (query) => repository.findAndCountAll({ ...query, where: { [Op.and]: [query.where || {}, hide] } }) };
    return BaseService.prototype.getAll.call({ repository: filtered }, reqQuery, options);
  }

  async update(id, data, transaction = null) {
    const page = await this.repository.findById(id);
    if (page && isLandingSlug(page.slug)) {
      throw new Error('This page belongs to a Landing Page. Edit, publish or archive it under Landing Pages.');
    }
    if (data && isLandingSlug(data.slug)) throw new Error(`Slugs starting with "${LANDING_PREFIX}" are reserved for Landing Pages`);
    return super.update(id, data, transaction);
  }

  async create(data, transaction = null) {
    if (data && isLandingSlug(data.slug)) throw new Error(`Slugs starting with "${LANDING_PREFIX}" are reserved for Landing Pages`);
    return super.create(data, transaction);
  }

  async delete(id, transaction = null) {
    const page = await this.repository.findById(id);
    if (page && isLandingSlug(page.slug)) throw new Error('This page belongs to a Landing Page. Archive the landing page instead.');
    return super.delete(id, transaction);
  }

  /**
   * A draft copy of a page with its content and blocks (services/cloneRecord.js): "<title> (Copy)",
   * slug "<slug>-copy" (a journey stage / tool page stays under journey/ or tool/). The homepage and
   * landing page drafts are not cloned: there is one homepage, and landing pages have Versions.
   */
  async clone(id) {
    const page = await this.repository.findById(id);
    if (!page) {
      const err = new Error('Page not found');
      err.status = 404;
      throw err;
    }
    if (isLandingSlug(page.slug)) throw new Error('This page belongs to a Landing Page. Use the landing page Versions instead.');
    if (page.slug === 'home') throw new Error('The homepage cannot be cloned: the site has one homepage.');
    const plain = page.toJSON();
    return this.create({
      ...copyFields(plain, ['isFeatured']),
      title: copyTitle(plain.title),
      slug: await freeCopySlug('page', plain.slug),
      status: 'draft',
      isFeatured: false,
    });
  }

  async getBySlug(slug) {
    if (isLandingSlug(slug)) throw new Error('Page not found');
    const page = await this.repository.findOne({ where: { slug, status: 'published' } });
    if (!page) throw new Error('Page not found');
    const data = page.toJSON();
    data.sections = await SectionHydrator.hydrateSections(data.sections || []);
    return data;
  }

  /**
   * Journey Stage pages: published pages with a "JourneyHero" block (admin: Pages → Journey
   * Stage). The website builds each stage page's progress tracker, roadmap, flow and
   * previous / next links from this list, ordered by the hero's stage number.
   */
  async getJourneyStages() {
    const pages = await this.repository.model.findAll({
      where: { status: 'published' },
      attributes: ['id', 'slug', 'title', 'sections'],
    });
    const payloadOf = (section) => {
      const payload = section?.data?.payload;
      if (payload && typeof payload === 'object') return payload;
      try { return JSON.parse(payload || '{}'); } catch { return {}; }
    };

    return pages
      .map((page) => {
        const hero = (Array.isArray(page.sections) ? page.sections : []).find((s) => s?.type === 'JourneyHero');
        if (!hero) return null;
        const p = payloadOf(hero);
        const slug = String(page.slug || '').replace(/^\/+|\/+$/g, '');
        return {
          id: page.id,
          slug,
          url: `/${slug}`,
          number: String(p.number || '').trim(),
          title: String(p.title || page.title || '').trim(),
          shortLabel: String(p.shortLabel || '').trim(),
          icon: String(p.icon || '').trim(),
          color: String(p.color || '').trim(),
          tag: String(p.tag || '').trim(),
          roadmapText: String(p.roadmapText || '').trim(),
        };
      })
      .filter((stage) => stage && stage.slug)
      .sort((a, b) => (parseFloat(a.number) || 999) - (parseFloat(b.number) || 999) || a.title.localeCompare(b.title));
  }

  /**
   * Free tool pages: published pages with a "ToolCalculator" block (admin: Pages → Free Tools).
   * The website's tools hub and every tool page's "More free tools" list are built from this,
   * ordered by the ToolHero's "order" (then title). Card texts come from the ToolHero block.
   */
  async getTools() {
    const pages = await this.repository.model.findAll({
      where: { status: 'published' },
      attributes: ['id', 'slug', 'title', 'sections'],
    });
    const payloadOf = (section) => {
      const payload = section?.data?.payload;
      if (payload && typeof payload === 'object') return payload;
      try { return JSON.parse(payload || '{}'); } catch { return {}; }
    };

    return pages
      .map((page) => {
        const sections = Array.isArray(page.sections) ? page.sections : [];
        const calculator = sections.find((s) => s?.type === 'ToolCalculator');
        if (!calculator) return null;
        const hero = payloadOf(sections.find((s) => s?.type === 'ToolHero'));
        const slug = String(page.slug || '').replace(/^\/+|\/+$/g, '');
        return {
          id: page.id,
          slug,
          url: `/${slug}`,
          calculator: String(payloadOf(calculator).calculator || '').trim(),
          title: String(hero.title || page.title || '').trim(),
          icon: String(hero.icon || '').trim(),
          tag: String(hero.tag || '').trim(),
          description: String(hero.description || '').trim(),
          order: String(hero.order || '').trim(),
        };
      })
      .filter((tool) => tool && tool.slug)
      .sort((a, b) => (parseFloat(a.order) || 999) - (parseFloat(b.order) || 999) || a.title.localeCompare(b.title));
  }
}

module.exports = new PageService();
