const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

/**
 * Public: everything the website's sitemap needs, in one light request (no content, no sections).
 * The website decides what is listed with the same rules it renders pages with (robots,
 * canonical, SEO Config overrides): see the website's service/sitemapService.js.
 */
class SitemapController {
  async getEntries(req, res) {
    try {
      const { Service, Page, Seopage, Location, Seo, AboutPage, Blog } = require('../models');
      const { liveWhere } = require('./BlogPublicController');

      const [services, pages, seoPages, about, seoConfigs, blogs] = await Promise.all([
        Service.findAll({
          where: { status: 'published' },
          attributes: ['id', 'slug', 'robots', 'canonicalUrl', 'updatedAt'],
          order: [['title', 'ASC']]
        }),
        Page.findAll({
          where: { status: 'published' },
          attributes: ['id', 'slug', 'robots', 'canonicalUrl', 'updatedAt'],
          order: [['title', 'ASC']]
        }),
        Seopage.findAll({
          where: {
            status: 'PUBLISHED',
            longDescription: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
          },
          attributes: ['id', 'slug', 'indexable', 'canonicalUrl', 'updatedAt', 'locationId'],
          include: [{ model: Location, as: 'location', attributes: ['id', 'active'], required: false }],
          order: [['slug', 'ASC']]
        }),
        AboutPage.findOne({ attributes: ['updatedAt'] }),
        Seo.findAll({
          where: { status: 'active', targetType: { [Op.ne]: null } },
          attributes: ['targetType', 'targetId', 'route', 'robots', 'canonicalUrl', 'updatedAt']
        }),
        // Live blog posts (same rule as the public blog API)
        Blog.findAll({
          where: liveWhere(),
          attributes: ['id', 'slug', 'robots', 'canonicalUrl', 'updatedAt'].filter((f) => Blog.rawAttributes[f]),
          order: [['publishDate', 'DESC']]
        })
      ]);

      return successResponse(res, 'Sitemap entries retrieved', {
        services: services.map((s) => s.toJSON()),
        pages: pages.map((p) => p.toJSON()),
        // Same rule as the public lookup: a switched-off location hides its pages.
        seoPages: seoPages
          .filter((p) => !(p.locationId && p.location?.active === false))
          .map(({ id, slug, indexable, canonicalUrl, updatedAt }) => ({ id, slug, indexable, canonicalUrl, updatedAt })),
        about: about ? { updatedAt: about.updatedAt } : null,
        seoConfigs: seoConfigs.map((c) => c.toJSON()),
        blogs: blogs.map((b) => b.toJSON())
      });
    } catch (error) {
      logger.error(`Sitemap entries Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }
}

module.exports = new SitemapController();
