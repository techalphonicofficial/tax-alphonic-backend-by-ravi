const { Op } = require('sequelize');
const { Blog, BlogLike, BlogComment, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');
const { liveWhere } = require('./BlogPublicController');

/**
 * Likes and comments on website blog posts.
 * Public (website, through its Server Actions): engagement, like/unlike, comment feed, add comment.
 * Admin (auth + Blogs permission): list / approve / hide / delete comments.
 *
 * Visitors are anonymous: the website keeps a random visitor id in a cookie and sends it as
 * `visitorId`. One like per visitor per post (unique index). Comments with links wait for approval.
 */

const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;
const FEED_LIMIT = 10;
const MAX_LINKS = 1;

const clientIp = (req) => {
  const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
  return typeof raw === 'string' ? raw.split(',')[0].trim().slice(0, 64) : null;
};

const visitorOf = (value) => (VISITOR_RE.test(String(value || '')) ? String(value) : null);

/** Public shape: never the email, IP or visitor id. */
const toPublic = (comment, visitorId) => {
  const row = comment.toJSON ? comment.toJSON() : comment;
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    createdAt: row.createdAt,
    pending: row.status === 'pending',
    mine: Boolean(visitorId && row.visitorId === visitorId),
  };
};

// Feed cursor = "<createdAt ISO>|<id>" of the last comment shown (newest first).
const encodeCursor = (c) => Buffer.from(`${new Date(c.createdAt).toISOString()}|${c.id}`).toString('base64url');
const decodeCursor = (value) => {
  try {
    const [iso, id] = Buffer.from(String(value), 'base64url').toString().split('|');
    const date = new Date(iso);
    return id && !Number.isNaN(date.getTime()) ? { date, id } : null;
  } catch {
    return null;
  }
};

async function liveBlog(slug) {
  return Blog.findOne({ where: liveWhere({ slug }), attributes: ['id', 'likeCount'] });
}

const approvedCount = (blogId) => BlogComment.count({ where: { blogId, status: 'approved' } });

class BlogEngagementController {
  /** GET /blogs/public/:slug/engagement?visitorId= → { likeCount, liked, commentCount } */
  async engagement(req, res) {
    try {
      const blog = await liveBlog(req.params.slug);
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);
      const visitorId = visitorOf(req.query.visitorId);
      const [liked, commentCount] = await Promise.all([
        visitorId ? BlogLike.count({ where: { blogId: blog.id, visitorId } }) : 0,
        approvedCount(blog.id),
      ]);
      return successResponse(res, 'Engagement', { likeCount: blog.likeCount || 0, liked: liked > 0, commentCount });
    } catch (error) {
      logger.error(`Blog engagement Error: ${error.message}`);
      return errorResponse(res, 'Could not load likes', [], 500);
    }
  }

  /** POST /blogs/public/:slug/like { visitorId, liked } → sets (not toggles) the like, so repeated taps are safe. */
  async like(req, res) {
    const visitorId = visitorOf(req.body?.visitorId);
    if (!visitorId) return errorResponse(res, 'Missing visitor', [{ field: 'visitorId', message: 'Invalid visitor id' }], 422);
    const liked = req.body?.liked !== false;
    try {
      const blog = await liveBlog(req.params.slug);
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);

      const likeCount = await sequelize.transaction(async (transaction) => {
        if (liked) {
          await BlogLike.findOrCreate({
            where: { blogId: blog.id, visitorId },
            defaults: { ipAddress: clientIp(req) },
            transaction,
          });
        } else {
          await BlogLike.destroy({ where: { blogId: blog.id, visitorId }, transaction });
        }
        const total = await BlogLike.count({ where: { blogId: blog.id }, transaction });
        await Blog.update({ likeCount: total }, { where: { id: blog.id }, hooks: false, silent: true, transaction });
        return total;
      });

      return successResponse(res, liked ? 'Liked' : 'Unliked', { liked, likeCount });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const likeCount = await BlogLike.count({ where: { blogId: (await liveBlog(req.params.slug))?.id } });
        return successResponse(res, 'Liked', { liked: true, likeCount });
      }
      logger.error(`Blog like Error: ${error.message}`);
      return errorResponse(res, 'Could not save the like', [], 500);
    }
  }

  /** GET /blogs/public/:slug/comments?cursor=&limit=&visitorId= → approved comments, newest first, cursor paged. */
  async comments(req, res) {
    try {
      const blog = await liveBlog(req.params.slug);
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);
      const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || FEED_LIMIT));
      const visitorId = visitorOf(req.query.visitorId);
      const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;

      const where = { blogId: blog.id, status: 'approved' };
      if (cursor) {
        where[Op.or] = [
          { createdAt: { [Op.lt]: cursor.date } },
          { createdAt: cursor.date, id: { [Op.lt]: cursor.id } },
        ];
      }
      const rows = await BlogComment.findAll({
        where,
        attributes: ['id', 'name', 'body', 'status', 'visitorId', 'createdAt'],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: limit + 1,
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const total = cursor ? undefined : await approvedCount(blog.id);

      return successResponse(res, 'Comments', {
        items: items.map((c) => toPublic(c, visitorId)),
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
        ...(total !== undefined ? { total } : {}),
      });
    } catch (error) {
      logger.error(`Blog comments Error: ${error.message}`);
      return errorResponse(res, 'Could not load comments', [], 500);
    }
  }

  /** POST /blogs/public/:slug/comments { name, email?, body, visitorId, _hp } */
  async addComment(req, res) {
    const input = req.body || {};
    const name = String(input.name || '').replace(/\s+/g, ' ').trim();
    const email = String(input.email || '').trim();
    const body = String(input.body || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    const errors = [];
    if (name.length < 2 || name.length > 80) errors.push({ field: 'name', message: 'Please enter your name (2–80 characters).' });
    if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push({ field: 'email', message: 'Please enter a valid email.' });
    if (body.length < 2) errors.push({ field: 'body', message: 'Please write a comment.' });
    if (body.length > 2000) errors.push({ field: 'body', message: 'Comments can be at most 2000 characters.' });
    if (errors.length) return errorResponse(res, 'Please check the comment', errors, 422);

    try {
      const blog = await liveBlog(req.params.slug);
      if (!blog) return errorResponse(res, 'Blog not found', [], 404);
      const visitorId = visitorOf(input.visitorId);

      // Honeypot filled in: pretend it worked, store nothing.
      if (input._hp) {
        logger.warn(`Blog comment honeypot triggered on ${req.params.slug} from ${clientIp(req)}`);
        return successResponse(res, 'Comment received', { comment: { id: 'hp', name, body, createdAt: new Date(), pending: true, mine: true } }, null, 201);
      }

      const links = (body.match(/https?:\/\/|www\./gi) || []).length;
      const comment = await BlogComment.create({
        blogId: blog.id,
        name,
        email: email || null,
        body,
        status: links > MAX_LINKS ? 'pending' : 'approved',
        visitorId,
        ipAddress: clientIp(req),
      });

      return successResponse(
        res,
        comment.status === 'pending' ? 'Thanks! Your comment will appear after a quick review.' : 'Comment posted',
        { comment: toPublic(comment, visitorId), total: await approvedCount(blog.id) },
        null,
        201
      );
    } catch (error) {
      logger.error(`Blog add comment Error: ${error.message}`);
      return errorResponse(res, 'Could not post the comment', [], 500);
    }
  }

  // ---------- Admin ----------

  /** GET /blog-comments?page=&limit=&status=&blogId=&search= */
  async adminList(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const where = {};
      if (['approved', 'pending', 'hidden'].includes(req.query.status)) where.status = req.query.status;
      if (req.query.blogId) where.blogId = req.query.blogId;
      const search = String(req.query.search || '').trim();
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { body: { [Op.like]: `%${search}%` } },
        ];
      }

      const [{ rows, count }, byStatus] = await Promise.all([
        BlogComment.findAndCountAll({
          where,
          include: [{ model: Blog, as: 'blog', attributes: ['id', 'title', 'slug'] }],
          order: [['createdAt', 'DESC']],
          offset: (page - 1) * limit,
          limit,
        }),
        BlogComment.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      ]);

      const counts = { approved: 0, pending: 0, hidden: 0 };
      byStatus.forEach((r) => { counts[r.status] = Number(r.count); });

      return res.status(200).json({
        success: true,
        message: 'Comments retrieved',
        data: rows,
        counts,
        pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page, itemsPerPage: limit },
      });
    } catch (error) {
      logger.error(`Admin blog comments Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  /** PATCH /blog-comments/:id { status } */
  async adminSetStatus(req, res) {
    try {
      const status = req.body?.status;
      if (!['approved', 'pending', 'hidden'].includes(status)) {
        return errorResponse(res, 'Invalid status', [{ field: 'status', message: 'Use approved, pending or hidden' }], 422);
      }
      const comment = await BlogComment.findByPk(req.params.id);
      if (!comment) return errorResponse(res, 'Comment not found', [], 404);
      await comment.update({ status });
      return successResponse(res, 'Comment updated', comment);
    } catch (error) {
      logger.error(`Admin blog comment status Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  /** DELETE /blog-comments/:id (permanent) */
  async adminDelete(req, res) {
    try {
      const comment = await BlogComment.findByPk(req.params.id);
      if (!comment) return errorResponse(res, 'Comment not found', [], 404);
      await comment.destroy();
      return successResponse(res, 'Comment deleted');
    } catch (error) {
      logger.error(`Admin blog comment delete Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new BlogEngagementController();
