const { Op } = require('sequelize');
const { Blog, BlogCategory, BlogAuthor, BlogTag, BlogFaq, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');
const SectionHydrator = require('../services/SectionHydrator');

/**
 * Public blog API for the website (/blog, /blog/:slug). Only posts that are live are returned:
 * status published (or scheduled whose date has come), publishDate empty or in the past and
 * expiryDate empty or in the future. Drafts never leave the admin.
 */

const AUTHOR = { model: BlogAuthor, as: 'author', attributes: ['id', 'name', 'bio', 'avatar', 'socialLinks'] };
const CATEGORY = { model: BlogCategory, as: 'category', attributes: ['id', 'name', 'slug'] };
const TAGS = { model: BlogTag, as: 'tags', attributes: ['id', 'name', 'slug'], through: { attributes: [] } };
const LIST_FIELDS = ['id', 'title', 'slug', 'excerpt', 'content', 'featuredImage', 'readTime', 'publishDate', 'createdAt', 'updatedAt', 'isFeatured', 'isPinned', 'viewCount'];

function liveWhere(extra = {}) {
  const now = new Date();
  return {
    [Op.and]: [
      { status: { [Op.in]: ['published', 'scheduled'] } },
      { [Op.or]: [{ status: 'published' }, { publishDate: { [Op.lte]: now } }] },
      { [Op.or]: [{ publishDate: null }, { publishDate: { [Op.lte]: now } }] },
      { [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }] },
      extra,
    ],
  };
}

/** Plain text of the post body: Page Builder sections (JSON) or legacy HTML. */
function bodyText(content) {
  let html = String(content || '');
  try {
    const sections = JSON.parse(html);
    if (Array.isArray(sections)) {
      html = sections.map((s) => JSON.stringify(s?.data?.payload ?? s?.payload ?? '')).join(' ');
    }
  } catch {
    // legacy HTML
  }
  return html
    .replace(/\\[nrt]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/"[a-zA-Z]+":/g, ' ')
    .replace(/[{}[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) && date.getFullYear() > 1970 ? date : null;
};

/** A card: no body, an excerpt (written or the first words), minutes to read and a usable date. */
function toCard(blog) {
  const row = blog.toJSON ? blog.toJSON() : blog;
  const text = bodyText(row.content);
  const words = text ? text.split(' ').length : 0;
  const excerpt = String(row.excerpt || '').trim() || (text.length > 180 ? `${text.slice(0, 180).replace(/\s+\S*$/, '')}…` : text);
  delete row.content;
  return {
    ...row,
    excerpt,
    readTime: Number(row.readTime) > 0 ? Number(row.readTime) : Math.max(1, Math.round(words / 200)),
    date: validDate(row.publishDate) || validDate(row.createdAt),
  };
}

class BlogPublicController {
  /** GET /blogs/public?page=&limit=&category=<slug>&tag=<slug>&search= */
  async list(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
      const search = String(req.query.search || '').trim();
      const include = [AUTHOR, { ...CATEGORY }, { ...TAGS }];

      if (req.query.category) include[1] = { ...CATEGORY, where: { slug: req.query.category }, required: true };
      if (req.query.tag) include[2] = { ...TAGS, where: { slug: req.query.tag }, required: true };
      const extra = search ? { [Op.or]: [{ title: { [Op.like]: `%${search}%` } }, { excerpt: { [Op.like]: `%${search}%` } }] } : {};

      const { rows, count } = await Blog.findAndCountAll({
        where: liveWhere(extra),
        attributes: LIST_FIELDS,
        include,
        distinct: true,
        order: [['isPinned', 'DESC'], ['publishDate', 'DESC'], ['createdAt', 'DESC']],
        offset: (page - 1) * limit,
        limit,
      });

      return successResponse(res, 'Blogs retrieved', rows.map(toCard), {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit,
      });
    } catch (error) {
      logger.error(`Public blogs Error: ${error.message}`);
      return errorResponse(res, 'Could not load blogs', [], 500);
    }
  }

  /** GET /blogs/public/categories → categories that have live posts, with counts. */
  async categories(req, res) {
    try {
      const rows = await Blog.findAll({
        where: liveWhere({ categoryId: { [Op.ne]: null } }),
        attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('Blog.id')), 'count']],
        include: [{ ...CATEGORY }],
        group: ['categoryId', 'category.id'],
      });
      const list = rows
        .filter((r) => r.category)
        .map((r) => ({ id: r.category.id, name: r.category.name, slug: r.category.slug, count: Number(r.get('count')) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return successResponse(res, 'Blog categories retrieved', list);
    } catch (error) {
      logger.error(`Public blog categories Error: ${error.message}`);
      return errorResponse(res, 'Could not load categories', [], 500);
    }
  }

  /** GET /blogs/public/:slug → the post with its sections (Form / Packages hydrated), FAQs and related posts. */
  async bySlug(req, res) {
    try {
      const blog = await Blog.findOne({
        where: liveWhere({ slug: req.params.slug }),
        include: [AUTHOR, CATEGORY, TAGS, { model: BlogFaq, as: 'faqs', attributes: ['id', 'question', 'answer'] }],
      });
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);

      const data = blog.toJSON();
      const card = toCard({ ...data });
      try {
        const sections = JSON.parse(data.content || '[]');
        if (Array.isArray(sections)) data.sections = await SectionHydrator.hydrateSections(sections);
      } catch {
        // legacy HTML: rendered as is
      }

      const related = await Blog.findAll({
        where: liveWhere({ id: { [Op.ne]: blog.id }, ...(blog.categoryId ? { categoryId: blog.categoryId } : {}) }),
        attributes: LIST_FIELDS,
        include: [AUTHOR, CATEGORY],
        order: [['publishDate', 'DESC'], ['createdAt', 'DESC']],
        limit: 3,
      });
      // Not enough in the same category: fill up with the latest posts.
      if (related.length < 3) {
        const more = await Blog.findAll({
          where: liveWhere({ id: { [Op.notIn]: [blog.id, ...related.map((r) => r.id)] } }),
          attributes: LIST_FIELDS,
          include: [AUTHOR, CATEGORY],
          order: [['publishDate', 'DESC'], ['createdAt', 'DESC']],
          limit: 3 - related.length,
        });
        related.push(...more);
      }

      return successResponse(res, 'Blog retrieved', {
        ...data,
        excerpt: card.excerpt,
        readTime: card.readTime,
        date: card.date,
        related: related.map(toCard),
      });
    } catch (error) {
      logger.error(`Public blog Error: ${error.message}`);
      return errorResponse(res, 'Could not load the blog', [], 500);
    }
  }

  /** POST /blogs/public/:slug/view → counts one read (called once by the website's page). */
  async view(req, res) {
    try {
      await Blog.increment('viewCount', { by: 1, where: liveWhere({ slug: req.params.slug }), hooks: false, silent: true });
      return successResponse(res, 'Counted');
    } catch (error) {
      logger.error(`Blog view Error: ${error.message}`);
      return errorResponse(res, 'Could not count the view', [], 500);
    }
  }
}

module.exports = new BlogPublicController();
module.exports.liveWhere = liveWhere;
