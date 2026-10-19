const BaseService = require('./BaseService');
const InquiryRepository = require('../repositories/InquiryRepository');
const { Inquiry, User, Form } = require('../models');
const { Op } = require('sequelize');

const MailService = require('./MailService');

class InquiryService extends BaseService {
  constructor() {
    super(InquiryRepository);
  }

  async create(data) {
    const cleanData = {
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || '').trim(),
      website: data.website ? String(data.website).trim() : null,
      subject: data.subject ? String(data.subject).trim() : null,
      message: String(data.message || data.msg || '').trim(),
      source: data.source ? String(data.source).trim() : 'Website',
      status: 'NEW',
      priority: data.priority || 'MEDIUM',
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    };

    if (!cleanData.name) throw new Error('Full name is required');
    if (!cleanData.email) throw new Error('Email address is required');
    if (!cleanData.phone) throw new Error('Phone number is required');

    const newLead = await this.repository.create(cleanData);
    
    // Send email notification in the background
    MailService.sendLeadNotification(cleanData).catch(err => console.error('Failed to send mail:', err));

    return newLead;
  }

  async getAll(reqQuery = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      status,
      source,
      priority,
      name_like,
      email_like,
      phone_like,
      formId
    } = reqQuery;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const where = {};

    // Search query across multiple fields
    if (search && String(search).trim() !== '') {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
        { subject: { [Op.like]: term } },
        { message: { [Op.like]: term } }
      ];
    } else {
      if (name_like) where.name = { [Op.like]: `%${name_like}%` };
      if (email_like) where.email = { [Op.like]: `%${email_like}%` };
      if (phone_like) where.phone = { [Op.like]: `%${phone_like}%` };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (source && source !== 'ALL') {
      where.source = { [Op.like]: `%${source}%` };
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (formId) {
      where.formId = formId;
    }

    const query = {
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'name', 'slug'],
          paranoid: false
        }
      ]
    };

    const result = await this.repository.findAndCountAll(query);

    return {
      data: result.rows,
      pagination: {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / parseInt(limit, 10)),
        currentPage: parseInt(page, 10),
        itemsPerPage: parseInt(limit, 10)
      }
    };
  }

  async getById(id) {
    const item = await this.repository.findWithDetails(id);
    if (!item) throw new Error('Inquiry not found');
    return item;
  }

  async getStats() {
    const counts = await Inquiry.findAll({
      attributes: [
        'status',
        [Inquiry.sequelize.fn('COUNT', Inquiry.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const stats = {
      total: 0,
      new: 0,
      contacted: 0,
      inProgress: 0,
      converted: 0,
      closed: 0,
      junk: 0
    };

    counts.forEach(c => {
      const cnt = parseInt(c.count, 10) || 0;
      stats.total += cnt;
      if (c.status === 'NEW') stats.new = cnt;
      else if (c.status === 'CONTACTED') stats.contacted = cnt;
      else if (c.status === 'IN_PROGRESS') stats.inProgress = cnt;
      else if (c.status === 'CONVERTED') stats.converted = cnt;
      else if (c.status === 'CLOSED') stats.closed = cnt;
      else if (c.status === 'JUNK') stats.junk = cnt;
    });

    return stats;
  }
}

module.exports = new InquiryService();
