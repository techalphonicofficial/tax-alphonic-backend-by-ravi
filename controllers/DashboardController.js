const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const db = require('../models');
const { logger } = require('../config/logger');

/**
 * GET /dashboard/stats: everything the admin dashboard shows, in one call.
 * - counts: every module, split by status (services / pages / blogs / SEO pages ...)
 * - leads: enquiry totals, this vs last month, per status / source / form, 30-day series, latest leads
 * - attention: things waiting for someone (new enquiries, drafts, services without SEO, Trash)
 * - recentActivity (audit log), recentServices, topBlogs, media (files, size, active storage)
 */

const OLD_SERVICE_CATEGORY = 'old-service-data';
const TRASH_MODELS = ['Service', 'Page', 'Seopage', 'Seo', 'Blog', 'ServiceCategory', 'Form', 'Menu', 'MediaFolder', 'Media'];

/** { status: count } for a model with a status column. */
async function byStatus(Model, where = {}) {
  const rows = await Model.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true });
  return Object.fromEntries(rows.map((r) => [String(r.status || 'none').toLowerCase(), Number(r.n)]));
}

const sum = (map) => Object.values(map).reduce((a, b) => a + b, 0);
const count = (Model, where) => Model.count(where ? { where } : undefined);
const safe = (promise, fallback) => promise.catch((error) => {
  logger.error(`Dashboard partial error: ${error.message}`);
  return fallback;
});

/** Leads per day for the last `days` days (oldest first). */
async function dailyLeads(days) {
  const start = moment().subtract(days - 1, 'days').startOf('day');
  const rows = await db.Inquiry.findAll({
    where: { createdAt: { [Op.gte]: start.toDate() } },
    attributes: [[fn('DATE', col('createdAt')), 'day'], [fn('COUNT', col('id')), 'n']],
    group: [fn('DATE', col('createdAt'))],
    raw: true,
  });
  const perDay = Object.fromEntries(rows.map((r) => [moment(r.day).format('YYYY-MM-DD'), Number(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const day = start.clone().add(i, 'days');
    return { date: day.format('YYYY-MM-DD'), label: day.format('D MMM'), count: perDay[day.format('YYYY-MM-DD')] || 0 };
  });
}

async function leadsReport() {
  const { Inquiry, Form } = db;
  const since = (m) => ({ createdAt: { [Op.gte]: m.toDate() } });
  const thisMonth = moment().startOf('month');
  const lastMonth = moment().subtract(1, 'month').startOf('month');

  const [total, today, week, month, prevMonth, statuses, sources, forms, latest, series] = await Promise.all([
    Inquiry.count(),
    Inquiry.count({ where: since(moment().startOf('day')) }),
    Inquiry.count({ where: since(moment().subtract(6, 'days').startOf('day')) }),
    Inquiry.count({ where: since(thisMonth) }),
    Inquiry.count({ where: { createdAt: { [Op.gte]: lastMonth.toDate(), [Op.lt]: thisMonth.toDate() } } }),
    byStatus(Inquiry),
    Inquiry.findAll({ attributes: ['source', [fn('COUNT', col('id')), 'n']], group: ['source'], order: [[fn('COUNT', col('id')), 'DESC']], limit: 6, raw: true }),
    Inquiry.findAll({
      where: { formId: { [Op.ne]: null } },
      attributes: ['formId', [fn('COUNT', col('Inquiry.id')), 'n']],
      include: [{ model: Form, as: 'form', attributes: ['name'] }],
      group: ['formId', 'form.id'],
      order: [[fn('COUNT', col('Inquiry.id')), 'DESC']],
      limit: 5,
    }),
    Inquiry.findAll({ attributes: ['id', 'name', 'email', 'phone', 'subject', 'source', 'status', 'priority', 'createdAt'], order: [['createdAt', 'DESC']], limit: 6 }),
    dailyLeads(30),
  ]);

  return {
    total,
    today,
    week,
    month,
    lastMonth: prevMonth,
    // % change vs last month; null when last month had none (nothing to compare with)
    monthChange: prevMonth ? Math.round(((month - prevMonth) / prevMonth) * 100) : null,
    converted: statuses.converted || 0,
    conversionRate: total ? Math.round(((statuses.converted || 0) / total) * 100) : 0,
    byStatus: statuses,
    bySource: sources.map((s) => ({ source: s.source || 'Website', count: Number(s.n) })),
    byForm: forms.map((f) => ({ formId: f.formId, name: f.form?.name || 'Deleted form', count: Number(f.get('n')) })),
    latest,
    series,
  };
}

async function contentCounts() {
  const oldCategory = await db.ServiceCategory.findOne({ where: { slug: OLD_SERVICE_CATEGORY }, attributes: ['id'] });
  const notOld = oldCategory ? { [Op.or]: [{ categoryId: { [Op.ne]: oldCategory.id } }, { categoryId: null }] } : {};

  const [
    services, oldServices, serviceCategories, pages, seoPages, seoIndexable, seoConfigs, blogs, blogViews,
    blogCategories, forms, packages, faqs, testimonials, team, banners, partners, branches, countries,
    portfolio, locations, states, industries, technologies, problems, menus, users, roles,
  ] = await Promise.all([
    byStatus(db.Service, notOld),
    oldCategory ? count(db.Service, { categoryId: oldCategory.id }) : 0,
    count(db.ServiceCategory),
    byStatus(db.Page),
    byStatus(db.Seopage),
    count(db.Seopage, { status: 'PUBLISHED', indexable: true }),
    byStatus(db.Seo),
    byStatus(db.Blog),
    db.Blog.sum('viewCount'),
    count(db.BlogCategory),
    byStatus(db.Form),
    byStatus(db.Package),
    byStatus(db.Faq),
    byStatus(db.Testimonial),
    byStatus(db.TeamMember),
    byStatus(db.Banner),
    byStatus(db.Partner),
    byStatus(db.Branch),
    byStatus(db.Country),
    byStatus(db.PortfolioItem),
    count(db.Location),
    count(db.State),
    count(db.Industry),
    count(db.Technology),
    count(db.Problem),
    byStatus(db.Menu),
    db.User.count(),
    db.Role.count(),
  ]);

  const block = (map, live) => ({ total: sum(map), live: map[live] || 0, ...map });
  return {
    oldServiceCategoryId: oldCategory?.id || null,
    services: { ...block(services, 'published'), old: oldServices },
    serviceCategories,
    pages: block(pages, 'published'),
    seoPages: { ...block(seoPages, 'published'), indexable: seoIndexable },
    seoConfigs: block(seoConfigs, 'active'),
    blogs: { ...block(blogs, 'published'), views: Number(blogViews) || 0 },
    blogCategories,
    forms: block(forms, 'active'),
    packages: block(packages, 'active'),
    faqs: block(faqs, 'published'),
    testimonials: block(testimonials, 'published'),
    team: block(team, 'published'),
    banners: block(banners, 'published'),
    partners: block(partners, 'active'),
    branches: block(branches, 'active'),
    countries: block(countries, 'active'),
    portfolio: block(portfolio, 'published'),
    locations,
    states,
    industries,
    technologies,
    problems,
    menus: block(menus, 'active'),
    users,
    roles,
  };
}

async function mediaReport() {
  const [files, folders, bytes, images, storage] = await Promise.all([
    db.Media.count(),
    db.MediaFolder.count(),
    db.Media.sum('size'),
    db.Media.count({ where: { mimeType: { [Op.like]: 'image/%' } } }),
    db.StorageSetting.findOne({ attributes: ['activeProvider'] }),
  ]);
  return { files, folders, images, bytes: Number(bytes) || 0, provider: storage?.activeProvider || 'local' };
}

async function attention(counts, leads) {
  const notOld = counts.oldServiceCategoryId
    ? [{ [Op.or]: [{ categoryId: { [Op.ne]: counts.oldServiceCategoryId } }, { categoryId: null }] }]
    : [];
  const emptySeo = (field) => ({ [Op.or]: [{ [field]: null }, { [field]: '' }] });
  const [servicesNoSeo, highPriority, trashCounts] = await Promise.all([
    db.Service.count({ where: { status: 'published', [Op.and]: [...notOld, { [Op.or]: [emptySeo('metaTitle'), emptySeo('metaDescription')] }] } }),
    db.Inquiry.count({ where: { priority: 'HIGH', status: { [Op.notIn]: ['CONVERTED', 'CLOSED', 'JUNK'] } } }),
    // Same rows the Trash page lists (files / folders inside a trashed folder are not counted on their own)
    Promise.all(TRASH_MODELS.map((m) => db[m].count({
      where: { deletedAt: { [Op.ne]: null }, ...(db[m].rawAttributes.trashedWithFolderId ? { trashedWithFolderId: null } : {}) },
      paranoid: false,
    }))),
  ]);

  return {
    newLeads: leads.byStatus.new || 0,
    highPriorityLeads: highPriority,
    draftServices: counts.services.draft || 0,
    draftSeoPages: counts.seoPages.draft || 0,
    draftBlogs: counts.blogs.draft || 0,
    servicesWithoutSeo: servicesNoSeo,
    trash: trashCounts.reduce((a, b) => a + b, 0),
  };
}

async function recentActivity() {
  const logs = await db.AuditLog.findAll({
    limit: 8,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'action', 'module', 'description', 'createdAt'],
    include: [{ association: 'user', attributes: ['firstName', 'lastName', 'email'] }],
  });
  return logs.map((log) => ({
    id: log.id,
    user: log.user ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email : 'System',
    action: log.action,
    module: log.module,
    description: log.description || `${log.action} ${log.module}`,
    time: log.createdAt,
  }));
}

exports.getDashboardStats = async (req, res) => {
  try {
    const [counts, leads, media, activity, recentServices, topBlogs] = await Promise.all([
      contentCounts(),
      leadsReport(),
      safe(mediaReport(), { files: 0, folders: 0, images: 0, bytes: 0, provider: 'local' }),
      safe(recentActivity(), []),
      db.Service.findAll({ attributes: ['id', 'title', 'slug', 'status', 'updatedAt'], order: [['updatedAt', 'DESC']], limit: 6 }),
      db.Blog.findAll({ where: { status: 'published' }, attributes: ['id', 'title', 'slug', 'viewCount'], order: [['viewCount', 'DESC']], limit: 5 }),
    ]);
    const todo = await safe(attention(counts, leads), {});

    res.json({
      success: true,
      data: { generatedAt: new Date(), counts, leads, media, attention: todo, recentActivity: activity, recentServices, topBlogs },
    });
  } catch (error) {
    logger.error(`Dashboard Stats Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Could not load the dashboard.' });
  }
};
