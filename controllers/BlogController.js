const { Blog, BlogCategory, BlogAuthor, BlogTag, BlogFaq, BlogLike, BlogComment, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');
const SectionHydrator = require('../services/SectionHydrator');
const { Op } = require('sequelize');

class BlogController {
  
  // Basic CRUD
  async create(req, res) {
    try {
      // Logic for slug auto-generation (if not provided)
      let slug = req.body.slug;
      if (!slug && req.body.title) {
        slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }

      const blog = await Blog.create({ ...req.body, slug });
      
      // Handle Tags
      if (req.body.tags && req.body.tags.length > 0) {
        await blog.setTags(req.body.tags);
      }

      return successResponse(res, 'Blog created successfully', blog, null, 201);
    } catch (error) {
      logger.error(`Create Blog Error: ${error.message}`);
      let errorMessage = error.message;
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        errorMessage = error.errors.map(e => e.message).join(', ');
      }
      return errorResponse(res, errorMessage);
    }
  }

  async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'DESC',
        status, authorId, categoryId, search, tagId
      } = req.query;

      const offset = (page - 1) * limit;
      let where = {};

      if (status) where.status = status;
      if (authorId) where.authorId = authorId;
      if (categoryId) where.categoryId = categoryId;
      if (search) {
        where.title = { [Op.like]: `%${search}%` };
      }

      let includeArray = [
        { model: BlogCategory, as: 'category' },
        { model: BlogAuthor, as: 'author' },
        { model: BlogTag, as: 'tags' }
      ];

      // If filtering by tag, we need to enforce the tag condition
      if (tagId) {
        includeArray = [
          { model: BlogCategory, as: 'category' },
          { model: BlogAuthor, as: 'author' },
          { model: BlogTag, as: 'tags', where: { id: tagId } }
        ];
      }

      let orderClause = [];
      if (sortBy === 'category') {
        orderClause = [[{ model: BlogCategory, as: 'category' }, 'name', sortOrder.toUpperCase()]];
      } else if (sortBy === 'author') {
        orderClause = [[{ model: BlogAuthor, as: 'author' }, 'name', sortOrder.toUpperCase()]];
      } else {
        orderClause = [[sortBy, sortOrder.toUpperCase()]];
      }

      const { count, rows } = await Blog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: orderClause,
        include: includeArray
      });

      return successResponse(res, 'Blogs retrieved successfully', rows, {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      logger.error(`Get Blogs Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const blog = await Blog.findByPk(req.params.id, {
        include: [
          { model: BlogCategory, as: 'category' },
          { model: BlogAuthor, as: 'author' },
          { model: BlogTag, as: 'tags' },
          { model: BlogFaq, as: 'faqs' }
        ]
      });

      if (!blog) {
        return errorResponse(res, 'Blog not found', [], 404);
      }

      return successResponse(res, 'Blog retrieved successfully', blog);
    } catch (error) {
      logger.error(`Get Blog Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getBySlug(req, res) {
    try {
      const blog = await Blog.findOne({
        where: { slug: req.params.slug },
        include: [
          { model: BlogCategory, as: 'category' },
          { model: BlogAuthor, as: 'author' },
          { model: BlogTag, as: 'tags' },
          { model: BlogFaq, as: 'faqs' }
        ]
      });

      if (!blog) {
        return errorResponse(res, 'Blog not found', [], 404);
      }

      // content holds the Page Builder sections as a JSON string; expose them
      // parsed with Form/Packages blocks resolved, leaving content untouched
      const data = blog.toJSON();
      try {
        const sections = JSON.parse(data.content || '[]');
        if (Array.isArray(sections)) {
          data.sections = await SectionHydrator.hydrateSections(sections);
        }
      } catch (e) {
        // Legacy HTML content, nothing to hydrate
      }

      return successResponse(res, 'Blog retrieved successfully', data);
    } catch (error) {
      logger.error(`Get Blog by slug Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async update(req, res) {
    try {
      const blog = await Blog.findByPk(req.params.id);
      if (!blog) {
        return errorResponse(res, 'Blog not found', [], 404);
      }

      await blog.update(req.body);

      // Handle Tags
      if (req.body.tags) {
        await blog.setTags(req.body.tags);
      }

      return successResponse(res, 'Blog updated successfully', blog);
    } catch (error) {
      logger.error(`Update Blog Error: ${error.message}`);
      let errorMessage = error.message;
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        errorMessage = error.errors.map(e => e.message).join(', ');
      }
      return errorResponse(res, errorMessage);
    }
  }

  async delete(req, res) {
    try {
      const blog = await Blog.findByPk(req.params.id);
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);

      // Hard delete to remove completely from the database
      await blog.destroy({ force: true });
      return successResponse(res, 'Blog deleted permanently');
    } catch (error) {
      logger.error(`Delete Blog Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  // Advanced Operations
  async getDashboardStats(req, res) {
    try {
      // 1. Top posts by views + likes, each with its approved comment count
      const commentCount = sequelize.literal("(SELECT COUNT(*) FROM blog_comments c WHERE c.blogId = Blog.id AND c.status = 'approved')");
      const topPosts = await Blog.findAll({
        attributes: ['id', 'title', 'viewCount', 'likeCount', 'slug', [commentCount, 'commentCount']],
        where: { status: 'published' },
        order: [[sequelize.literal('viewCount + likeCount'), 'DESC'], ['viewCount', 'DESC']],
        limit: 7
      });

      // 2. Recent Publishing Activity
      const recentPosts = await Blog.findAll({
        attributes: ['id', 'title', 'createdAt', 'status'],
        include: [{ model: BlogAuthor, as: 'author', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      // 3. Posts by Category Count
      const categoryCounts = await Blog.findAll({
        attributes: [
          'categoryId',
          [sequelize.fn('COUNT', sequelize.col('Blog.id')), 'postCount']
        ],
        include: [{
          model: BlogCategory,
          as: 'category',
          attributes: ['name']
        }],
        group: ['categoryId', 'category.id'],
        order: [[sequelize.literal('postCount'), 'DESC']],
        limit: 6
      });

      // 4. Engagement totals and the last 30 days of likes / comments (one point per day)
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 29);
      const day = (col) => sequelize.fn('DATE_FORMAT', sequelize.col(col), '%Y-%m-%d');
      const [totals, comments, likesByDay, commentsByDay] = await Promise.all([
        Blog.findOne({ attributes: [[sequelize.fn('SUM', sequelize.col('viewCount')), 'views'], [sequelize.fn('SUM', sequelize.col('likeCount')), 'likes']], raw: true }),
        BlogComment.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true }),
        BlogLike.findAll({ attributes: [[day('createdAt'), 'day'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']], where: { createdAt: { [Op.gte]: since } }, group: [day('createdAt')], raw: true }),
        BlogComment.findAll({ attributes: [[day('createdAt'), 'day'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']], where: { createdAt: { [Op.gte]: since }, status: { [Op.ne]: 'hidden' } }, group: [day('createdAt')], raw: true }),
      ]);
      const commentStatus = { approved: 0, pending: 0, hidden: 0 };
      comments.forEach((r) => { commentStatus[r.status] = Number(r.count); });
            const toMap = (rows) => Object.fromEntries(rows.map((r) => [String(r.day), Number(r.count)]));
      const likeMap = toMap(likesByDay);
      const commentMap = toMap(commentsByDay);
      const series = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { date: iso, likes: likeMap[iso] || 0, comments: commentMap[iso] || 0 };
      });

      return successResponse(res, 'Dashboard stats retrieved', {
        topPosts,
        recentPosts,
        categoryCounts,
        engagement: {
          views: Number(totals?.views) || 0,
          likes: Number(totals?.likes) || 0,
          comments: commentStatus,
          series,
        },
      });
    } catch (error) {
      logger.error(`Get Dashboard Stats Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getTrash(req, res) {
    try {
      const blogs = await Blog.findAll({
        where: { deletedAt: { [Op.ne]: null } },
        paranoid: false
      });
      return successResponse(res, 'Trashed blogs retrieved', blogs);
    } catch (error) {
      logger.error(`Get Trashed Blogs Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async restore(req, res) {
    try {
      const blog = await Blog.findByPk(req.params.id, { paranoid: false });
      if (!blog) return errorResponse(res, 'Blog not found in trash', [], 404);
      
      await blog.restore();
      return successResponse(res, 'Blog restored successfully');
    } catch (error) {
      logger.error(`Restore Blog Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async duplicate(req, res) {
    try {
      const original = await Blog.findByPk(req.params.id, { include: ['tags'] });
      if (!original) return errorResponse(res, 'Blog not found', [], 404);

      const newBlogData = original.toJSON();
      delete newBlogData.id;
      newBlogData.title = `${original.title} (Copy)`;
      newBlogData.slug = `${original.slug}-copy-${Date.now()}`;
      newBlogData.status = 'draft';
      newBlogData.viewCount = 0;
      newBlogData.likeCount = 0;
      newBlogData.shareCount = 0;

      const newBlog = await Blog.create(newBlogData);
      
      if (original.tags && original.tags.length > 0) {
        await newBlog.setTags(original.tags.map(t => t.id));
      }

      return successResponse(res, 'Blog duplicated successfully', newBlog);
    } catch (error) {
      logger.error(`Duplicate Blog Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async bulkAction(req, res) {
    try {
      const { ids, action, value } = req.body;
      if (!ids || !ids.length) return errorResponse(res, 'No IDs provided', [], 400);

      switch (action) {
        case 'publish':
          await Blog.update({ status: 'published' }, { where: { id: ids } });
          break;
        case 'archive':
          await Blog.update({ status: 'archived' }, { where: { id: ids } });
          break;
        case 'delete':
          await Blog.destroy({ where: { id: ids }, force: true });
          break;
        case 'restore':
          await Blog.restore({ where: { id: ids } });
          break;
        case 'hard_delete':
          await Blog.destroy({ where: { id: ids }, force: true });
          break;
        default:
          return errorResponse(res, 'Invalid action', [], 400);
      }

      return successResponse(res, `Bulk action '${action}' completed successfully`);
    } catch (error) {
      logger.error(`Bulk Action Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

}

module.exports = new BlogController();
