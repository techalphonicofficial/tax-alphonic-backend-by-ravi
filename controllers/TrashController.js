const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

/**
 * Trash (admin: /trash): records that were deleted (soft delete, `deletedAt` set) can be listed,
 * restored as they were (a service with its Page Builder blocks, SEO and URL) or deleted forever.
 * Every restore / permanent delete is written to the audit log by utils/auditHooks.js.
 *
 * MODULES lists what can be trashed: the model, the field shown as its name, the field shown as
 * its URL, the permission module (restoring or purging needs that module's "delete" permission)
 * and what else goes when it is deleted forever.
 * `hidden`: rows that are not listed on their own (files / subfolders that went to the Trash
 * inside a folder: they are restored or deleted with that folder).
 */
const MODULES = {
  services: { model: 'Service', label: 'Services', name: 'title', url: (r) => `/${r.slug}`, permission: 'Services' },
  pages: { model: 'Page', label: 'Pages', name: 'title', url: (r) => (r.slug === 'home' ? '/' : `/${r.slug}`), permission: 'CMS' },
  'seo-pages': { model: 'Seopage', label: 'SEO Pages', name: 'title', url: (r) => `/${r.slug}`, permission: 'SEO' },
  'seo-configs': { model: 'Seo', label: 'SEO Configs', name: (r) => r.targetLabel || r.route, url: (r) => r.route, permission: 'SEO' },
  blogs: { model: 'Blog', label: 'Blogs', name: 'title', url: (r) => `/blog/${r.slug}`, permission: 'Blogs' },
  'service-categories': { model: 'ServiceCategory', label: 'Service Categories', name: 'name', url: (r) => r.slug, permission: 'Services' },
  forms: { model: 'Form', label: 'Forms', name: 'name', url: (r) => r.slug, permission: 'Forms' },
  menus: { model: 'Menu', label: 'Menus', name: 'name', url: (r) => r.location, permission: 'Menus' },
  media: { model: 'Media', label: 'Media', name: (r) => r.originalName || r.filename, url: (r) => r.url, permission: 'Media', hidden: { trashedWithFolderId: null } },
  'media-folders': { model: 'MediaFolder', label: 'Media Folders', name: 'name', url: () => '', permission: 'Media', hidden: { trashedWithFolderId: null } },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Extra text under a row's name: what a trashed folder holds. */
async function describeRows(moduleKey, rows) {
  if (moduleKey !== 'media-folders' || !rows.length) return {};
  const contents = await MediaFolderService.trashedContents(rows.map((r) => r.id));
  return Object.fromEntries(Object.entries(contents).map(([id, c]) => [id,
    c.files || c.folders ? `Contains ${[c.folders && plural(c.folders, 'folder'), plural(c.files, 'file')].filter(Boolean).join(', ')}` : 'Empty folder']));
}

const models = () => require('../models');
const MediaFolderService = require('../services/MediaFolderService');
const moduleOf = (key) => MODULES[key] || null;
const nameOf = (config, row) => (typeof config.name === 'function' ? config.name(row) : row[config.name]) || '(untitled)';

/** Same rule as middlewares/auth checkPermission, for a module chosen at runtime. */
function allowed(req, action, permissionModule) {
  const role = req.user?.role;
  if (!role) return false;
  if (role.name === 'Admin') return true;
  return (role.permissions || []).some((p) => p.action === action && p.module === permissionModule);
}

/** Who deleted each record: the latest DELETE audit entry per record id. */
async function deletedBy(ids) {
  if (!ids.length) return {};
  const { AuditLog, User } = models();
  const logs = await AuditLog.findAll({
    where: { action: 'DELETE', recordId: { [Op.in]: ids.map(String) } },
    attributes: ['recordId', 'userId', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
  const users = userIds.length ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'firstName', 'lastName', 'email'] }) : [];
  const userName = Object.fromEntries(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email]));
  const result = {};
  logs.forEach((l) => {
    if (!result[l.recordId]) result[l.recordId] = l.userId ? userName[l.userId] || 'Unknown user' : 'System';
  });
  return result;
}

/** Removes what belongs to a record before it is deleted forever. */
async function purgeChildren(moduleKey, ids, transaction) {
  const db = models();
  if (moduleKey === 'services') {
    const sections = await db.ServiceSection.findAll({ where: { serviceId: ids }, attributes: ['id'], transaction });
    const sectionIds = sections.map((s) => s.id);
    if (sectionIds.length) await db.ServiceSectionData.destroy({ where: { serviceSectionId: sectionIds }, transaction });
    await db.ServiceSection.destroy({ where: { serviceId: ids }, transaction });
  }
  if (moduleKey === 'menus') {
    await db.MenuItem.destroy({ where: { menuId: ids }, transaction });
  }
  if (moduleKey === 'media-folders') {
    await MediaFolderService.purgeContents(ids, transaction);
  }
  if (moduleKey === 'media') {
    // The stored file (uploads/ or cloud bucket) goes too.
    const StorageService = require('../services/storage/StorageService');
    const files = await db.Media.findAll({ where: { id: ids }, paranoid: false, transaction });
    for (const file of files) await StorageService.remove(file);
  }
}

class TrashController {
  /** GET /trash/summary → [{ key, label, count }] for the modules the user may see. */
  async summary(req, res) {
    try {
      const db = models();
      const rows = [];
      for (const [key, config] of Object.entries(MODULES)) {
        if (!allowed(req, 'read', config.permission) && !allowed(req, 'delete', config.permission)) continue;
        const count = await db[config.model].count({ where: { deletedAt: { [Op.ne]: null }, ...config.hidden }, paranoid: false });
        rows.push({ key, label: config.label, count });
      }
      return successResponse(res, 'Trash summary', rows);
    } catch (error) {
      logger.error(`Trash summary Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  /** GET /trash/:module?search=&page=&limit= → deleted records, newest first. */
  async list(req, res) {
    try {
      const config = moduleOf(req.params.module);
      if (!config) return errorResponse(res, 'Unknown module', [], 404);
      if (!allowed(req, 'read', config.permission) && !allowed(req, 'delete', config.permission)) {
        return errorResponse(res, 'You do not have permission to view this.', [], 403);
      }

      const Model = models()[config.model];
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const where = { deletedAt: { [Op.ne]: null }, ...config.hidden };
      const search = String(req.query.search || '').trim();
      if (search) {
        const fields = ['title', 'name', 'slug', 'route', 'targetLabel', 'location', 'originalName', 'filename'].filter((f) => Model.rawAttributes[f]);
        where[Op.or] = fields.map((f) => ({ [f]: { [Op.like]: `%${search}%` } }));
      }

      const { rows, count } = await Model.findAndCountAll({
        where,
        paranoid: false,
        order: [['deletedAt', 'DESC']],
        offset: (page - 1) * limit,
        limit,
      });
      const by = await deletedBy(rows.map((r) => r.id));
      const details = await describeRows(req.params.module, rows);

      return successResponse(res, 'Trash retrieved', rows.map((r) => {
        const row = r.toJSON();
        return {
          id: row.id,
          name: nameOf(config, row),
          url: config.url(row),
          detail: details[row.id] || null,
          status: row.status ?? null,
          deletedAt: row.deletedAt,
          deletedBy: by[String(row.id)] || null,
        };
      }), {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        itemsPerPage: limit,
      });
    } catch (error) {
      logger.error(`Trash list Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  /** POST /trash/:module/restore { ids } → puts the records back. */
  async restore(req, res) {
    try {
      const config = moduleOf(req.params.module);
      if (!config) return errorResponse(res, 'Unknown module', [], 404);
      if (!allowed(req, 'delete', config.permission)) return errorResponse(res, 'You do not have permission to restore this.', [], 403);
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
      if (!ids.length) return errorResponse(res, 'Select at least one item.', [], 422);

      const Model = models()[config.model];
      const rows = await Model.findAll({ where: { id: ids, deletedAt: { [Op.ne]: null }, ...config.hidden }, paranoid: false });
      const rowIds = rows.map((r) => r.id);
      const transaction = await models().sequelize.transaction();
      try {
        // One by one so the audit log gets a RESTORE entry for each.
        for (const row of rows) await row.restore({ transaction });
        if (req.params.module === 'media-folders') await MediaFolderService.restoreContents(rowIds, transaction);
        // A file / folder whose folder is still in the Trash comes back at the top level.
        if (['media', 'media-folders'].includes(req.params.module)) {
          await MediaFolderService.detachFromTrashedParents(config.model, rowIds, transaction);
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      return successResponse(res, `${rows.length} item(s) restored`, { restored: rows.map((r) => r.id) });
    } catch (error) {
      logger.error(`Trash restore Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  /** DELETE /trash/:module { ids } → deletes trashed records forever (only ones already in the Trash). */
  async purge(req, res) {
    const db = models();
    const transaction = await db.sequelize.transaction();
    try {
      const config = moduleOf(req.params.module);
      if (!config) {
        await transaction.rollback();
        return errorResponse(res, 'Unknown module', [], 404);
      }
      if (!allowed(req, 'delete', config.permission)) {
        await transaction.rollback();
        return errorResponse(res, 'You do not have permission to delete this.', [], 403);
      }
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
      if (!ids.length) {
        await transaction.rollback();
        return errorResponse(res, 'Select at least one item.', [], 422);
      }

      const Model = db[config.model];
      const rows = await Model.findAll({ where: { id: ids, deletedAt: { [Op.ne]: null }, ...config.hidden }, paranoid: false, transaction });
      const rowIds = rows.map((r) => r.id);
      if (rowIds.length) {
        await purgeChildren(req.params.module, rowIds, transaction);
        for (const row of rows) await row.destroy({ force: true, transaction });
      }
      await transaction.commit();

      return successResponse(res, `${rowIds.length} item(s) deleted forever`, { deleted: rowIds });
    } catch (error) {
      await transaction.rollback();
      logger.error(`Trash purge Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }
}

module.exports = new TrashController();
module.exports.MODULES = MODULES;
