'use strict';
const { Op } = require('sequelize');
const { NewsletterSubscriber, sequelize } = require('../models');

// Website newsletter sign-ups (routes/newsletterRoutes.js). One row per email address:
// subscribing again re-activates an unsubscribed address, an already-subscribed one is left as is.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{2,}$/;
const STATUSES = ['subscribed', 'unsubscribed'];
const SORTS = ['createdAt', 'email', 'name', 'status', 'subscribedAt'];

class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.status = 422;
    this.errors = [{ field, message }];
  }
}

const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function whereFor({ search, status }) {
  const where = {};
  if (STATUSES.includes(status)) where.status = status;
  const term = clean(search, 120);
  if (term) {
    where[Op.or] = [
      { email: { [Op.like]: `%${term}%` } },
      { name: { [Op.like]: `%${term}%` } },
      { source: { [Op.like]: `%${term}%` } },
    ];
  }
  return where;
}

/** A CSV cell: quoted, and never read as a formula by Excel / Sheets. */
function csvCell(value) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const NewsletterService = {
  ValidationError,

  /** Public sign-up. Returns { created, resubscribed, already }. */
  async subscribe({ email, name, source, _hp }, ipAddress) {
    // Honeypot filled in: a bot. Answer as if it worked, store nothing.
    if (clean(_hp, 200)) return { already: true };
    const address = clean(email, 190).toLowerCase();
    if (!address) throw new ValidationError('email', 'Please enter your email address.');
    if (!EMAIL.test(address)) throw new ValidationError('email', 'Please enter a valid email address.');

    const now = new Date();
    const existing = await NewsletterSubscriber.findOne({ where: { email: address } });
    if (existing) {
      if (existing.status === 'subscribed') return { already: true };
      await existing.update({ status: 'subscribed', subscribedAt: now, unsubscribedAt: null, source: clean(source, 255) || existing.source });
      return { resubscribed: true };
    }
    await NewsletterSubscriber.create({
      email: address,
      name: clean(name, 120) || null,
      source: clean(source, 255) || null,
      ipAddress: clean(ipAddress, 64) || null,
      status: 'subscribed',
      subscribedAt: now,
    });
    return { created: true };
  },

  /** Admin list: page, limit (max 100), search, status, sortBy, sortOrder. */
  async list(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const sortBy = SORTS.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = String(query.sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const [{ rows, count }, byStatus] = await Promise.all([
      NewsletterSubscriber.findAndCountAll({
        where: whereFor(query),
        attributes: { exclude: ['ipAddress'] },
        order: [[sortBy, sortOrder]],
        offset: (page - 1) * limit,
        limit,
      }),
      NewsletterSubscriber.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true }),
    ]);
    const counts = { all: 0, subscribed: 0, unsubscribed: 0 };
    byStatus.forEach((r) => { counts[r.status] = Number(r.count); counts.all += Number(r.count); });
    return {
      rows,
      counts,
      pagination: { totalItems: count, totalPages: Math.max(1, Math.ceil(count / limit)), currentPage: page, itemsPerPage: limit },
    };
  },

  /** Every matching row as CSV (same filters as the list). */
  async exportCsv(query = {}) {
    const rows = await NewsletterSubscriber.findAll({ where: whereFor(query), order: [['createdAt', 'DESC']], raw: true });
    const head = ['Email', 'Name', 'Status', 'Source page', 'Subscribed at', 'Unsubscribed at'];
    const lines = rows.map((r) => [r.email, r.name, r.status, r.source, r.subscribedAt || r.createdAt, r.unsubscribedAt].map(csvCell).join(','));
    return `﻿${[head.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
  },

  async setStatus(id, status) {
    if (!STATUSES.includes(status)) throw new ValidationError('status', 'Status must be subscribed or unsubscribed.');
    const row = await NewsletterSubscriber.findByPk(id);
    if (!row) return null;
    const now = new Date();
    await row.update(status === 'subscribed'
      ? { status, subscribedAt: row.subscribedAt || now, unsubscribedAt: null }
      : { status, unsubscribedAt: now });
    return row;
  },

  async remove(id) {
    return NewsletterSubscriber.destroy({ where: { id } });
  },
};

module.exports = NewsletterService;
