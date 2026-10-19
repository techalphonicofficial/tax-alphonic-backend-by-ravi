const { Op } = require('sequelize');
const AuditLogRepository = require('../repositories/AuditLogRepository');
const BaseService = require('./BaseService');
const requestContext = require('../utils/requestContext');
const { logger } = require('../config/logger');
const { AuditLog, User, sequelize } = require('../models');

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'CLEAR'];

class AuditLogService extends BaseService {
  constructor() {
    super(AuditLogRepository);
  }

  async logAction(userId, action, module, recordId, description, oldData, newData, ipAddress, userAgent) {
    return await this.create({
      userId,
      action,
      module,
      recordId,
      description,
      oldData,
      newData,
      ipAddress,
      userAgent
    });
  }

  // Writes an audit entry for the current request (user/ip/agent come from the
  // request context). Never throws: a failed audit write must not fail the change.
  async record({ action, module, recordId = null, description = '', oldData = null, newData = null, transaction = null }) {
    const ctx = requestContext.get() || {};
    try {
      await AuditLog.create({
        userId: ctx.user?.id || null,
        action,
        module,
        recordId: recordId !== null && recordId !== undefined ? String(recordId) : null,
        description,
        oldData,
        newData,
        ipAddress: ctx.ip || null,
        userAgent: ctx.userAgent || null
      }, { transaction });
    } catch (error) {
      logger.error(`Audit log write failed (${action} ${module} ${recordId}): ${error.message}`);
    }
  }

  async getAll(reqQuery = {}) {
    const { page = 1, limit = 25, module, action, userId, recordId, search, from, to, sortOrder = 'DESC' } = reqQuery;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 25), 200);

    const where = {};
    if (module && module !== 'ALL') where.module = module;
    if (action && action !== 'ALL') where.action = action;
    if (userId && userId !== 'ALL') where.userId = userId === 'SYSTEM' ? null : userId;
    if (recordId) where.recordId = recordId;
    if (search && String(search).trim()) {
      where.description = { [Op.like]: `%${String(search).trim()}%` };
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00`);
      if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59.999`);
    }

    const result = await AuditLog.findAndCountAll({
      where,
      // List view: the heavy before/after snapshots are loaded on the detail view
      attributes: { exclude: ['oldData', 'newData'] },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], paranoid: false }],
      order: [['createdAt', String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum
    });

    return {
      data: result.rows,
      pagination: {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limitNum),
        currentPage: pageNum,
        itemsPerPage: limitNum,
      }
    };
  }

  async getById(id) {
    const log = await AuditLog.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], paranoid: false }]
    });
    if (!log) throw new Error('Audit log not found');
    return log;
  }

  // Values for the filter dropdowns in the admin panel
  async getFilters() {
    const [modules, users] = await Promise.all([
      AuditLog.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('module')), 'module']],
        order: [['module', 'ASC']],
        raw: true
      }),
      AuditLog.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
        where: { userId: { [Op.ne]: null } },
        raw: true
      })
    ]);

    const userRows = users.length
      ? await User.findAll({
        where: { id: users.map(u => u.userId) },
        attributes: ['id', 'firstName', 'lastName', 'email'],
        paranoid: false
      })
      : [];

    return {
      modules: modules.map(m => m.module).filter(Boolean),
      actions: ACTIONS,
      users: userRows.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email }))
    };
  }
}

module.exports = new AuditLogService();
