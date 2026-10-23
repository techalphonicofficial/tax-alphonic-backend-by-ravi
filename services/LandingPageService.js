const { Op } = require('sequelize');
const db = require('../models');
const SectionHydrator = require('./SectionHydrator');
const { normalizeSubdomain, subdomainError, labelFromHost, landingUrl } = require('./landing/subdomain');
const {
  HEADER_TYPE, FOOTER_TYPE, validateSections, referencesOf, normalizeSections,
} = require('./landing/landingValidation');

const { LandingPage, LandingPageVersion, Page, Service, User, Form, Package, sequelize } = db;

/*
 * Landing pages on subdomains (<slug>.taxalphonic.com), admin: Landing Pages.
 * - Draft: the blocks of the linked `pages` row (slug `landing-page/<slug>`, always status
 *   "draft", so the normal page routes never show it). Edited with the existing Page Builder.
 * - Publish: validates the draft, writes an immutable landing_page_versions snapshot and points
 *   publishedVersionId at it, in one transaction. The website reads only that snapshot
 *   (resolvePublic), so later draft saves never change the live page.
 * - Unpublish / archive clear publishedVersionId: the subdomain answers 404 at once.
 */

// Slug prefix of the draft pages behind landing pages (PageService hides and guards them).
const PAGE_SLUG_PREFIX = 'landing-page/';
const SORTABLE = new Set(['updatedAt', 'createdAt', 'title', 'slug', 'status', 'publishedAt']);
const SEO_FIELDS = ['metaTitle', 'metaDescription', 'keywords', 'ogImage', 'robots'];
const USER_ATTRS = ['id', 'firstName', 'lastName', 'email'];

class LandingPageError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
const fail = (status, message, errors = []) => { throw new LandingPageError(status, message, errors); };

const text = (value) => String(value ?? '').trim();
const userName = (user) => (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : null);
const isSafeAsset = (value) => !value || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value);

/** SEO fields from a request body: trimmed, empty → null, length-checked. */
function seoFrom(body, errors) {
  const seo = {};
  SEO_FIELDS.forEach((key) => {
    if (body[key] === undefined) return;
    const value = text(body[key]);
    seo[key] = value || null;
  });
  if (seo.metaTitle && seo.metaTitle.length > 255) errors.push({ field: 'metaTitle', message: 'Meta title must be at most 255 characters' });
  if (seo.keywords && seo.keywords.length > 500) errors.push({ field: 'keywords', message: 'Keywords must be at most 500 characters' });
  if (seo.ogImage && (seo.ogImage.length > 500 || !isSafeAsset(seo.ogImage))) errors.push({ field: 'ogImage', message: 'Share image must be an https URL or a Media path (/uploads/…)' });
  if (seo.robots && !/^[a-z, -]{1,100}$/i.test(seo.robots)) errors.push({ field: 'robots', message: 'Robots must look like "index, follow" or "noindex, nofollow"' });
  return seo;
}

/** Page Builder blocks of a service (Service Page Builder format → page format). */
async function serviceBlocks(serviceId) {
  const ServiceService = require('./ServiceService');
  const service = await ServiceService.getServiceWithSections(serviceId);
  const sections = (service?.sections || []).map((sec) => {
    const plain = sec.toJSON ? sec.toJSON() : sec;
    return { id: `svc_${plain.id}`, type: plain.type?.componentKey || plain.sectionTypeId, config: plain.config, payload: plain.data?.payload };
  });
  // "Locations We Serve" lists the service's location pages on the main site, not a campaign.
  return normalizeSections(sections.filter((s) => s.type && s.type !== 'LocationsServed'));
}

/** Plain row for the admin, with the public URL and whether the draft differs from the live version. */
function toAdmin(row) {
  const data = row.toJSON ? row.toJSON() : row;
  const published = data.status === 'published' && data.publishedVersionId;
  return {
    ...data,
    url: landingUrl(data.slug),
    isLive: Boolean(published),
    // draftUpdatedAt is cleared on publish and set by every draft save (DATETIME has whole seconds,
    // so comparing it with publishedAt would miss a save in the same second).
    hasUnpublishedChanges: Boolean(published && data.draftUpdatedAt),
    createdByName: userName(data.creator),
    updatedByName: userName(data.updater),
  };
}

class LandingPageService {
  get PAGE_SLUG_PREFIX() { return PAGE_SLUG_PREFIX; }

  /** '' when the slug is free for `exceptId` (or a new page), else the reason. */
  async slugProblem(slug, exceptId = null) {
    const error = subdomainError(slug);
    if (error) return error;
    const taken = await LandingPage.findOne({ where: { slug, ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}) }, attributes: ['id', 'title', 'status'] });
    if (taken) return `"${slug}" is already used by the landing page "${taken.title}"${taken.status === 'archived' ? ' (archived)' : ''}`;
    // The draft page's slug must be free too (pages.slug is unique, deleted pages included).
    const own = exceptId ? await LandingPage.findByPk(exceptId, { attributes: ['pageId'] }) : null;
    const page = await Page.findOne({ where: { slug: `${PAGE_SLUG_PREFIX}${slug}` }, paranoid: false, attributes: ['id'] });
    if (page && page.id !== own?.pageId) return `"${slug}" is held by an old page in the Trash (${PAGE_SLUG_PREFIX}${slug}); delete it forever first`;
    return '';
  }

  async checkSlug(value, exceptId) {
    const slug = normalizeSubdomain(value);
    const problem = slug ? await this.slugProblem(slug, exceptId) : 'Subdomain is required';
    return { slug, available: !problem, message: problem || 'Available', url: slug ? landingUrl(slug) : '' };
  }

  /** Services for the landing page form (id, title, slug, status), without needing the Services permission. */
  async serviceOptions() {
    const rows = await Service.findAll({ attributes: ['id', 'title', 'slug', 'status'], order: [['title', 'ASC']] });
    return rows.map((s) => s.toJSON());
  }

  async list(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 10));
    const sortBy = SORTABLE.has(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortOrder = String(query.sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const where = {};
    if (['draft', 'published', 'archived'].includes(query.status)) where.status = query.status;
    else if (query.status !== 'all') where.status = { [Op.ne]: 'archived' };
    if (query.serviceId) where.serviceId = String(query.serviceId);
    const search = text(query.search);
    if (search) where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { slug: { [Op.like]: `%${search}%` } }];

    const { rows, count } = await LandingPage.findAndCountAll({
      where,
      include: [
        { model: Service, as: 'service', attributes: ['id', 'title', 'slug'], required: false },
        { model: User, as: 'updater', attributes: USER_ATTRS, required: false },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    const grouped = await LandingPage.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['status'], raw: true });
    const counts = { all: 0, draft: 0, published: 0, archived: 0 };
    grouped.forEach((g) => { counts[g.status] = Number(g.n); if (g.status !== 'archived') counts.all += Number(g.n); });

    return {
      data: rows.map(toAdmin),
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit) || 1, currentPage: page, itemsPerPage: limit },
      counts,
    };
  }

  async find(id, { lock = null, transaction = null } = {}) {
    const row = await LandingPage.findByPk(id, { transaction, lock });
    if (!row) fail(404, 'Landing page not found');
    return row;
  }

  async getById(id) {
    const row = await LandingPage.findByPk(id, {
      include: [
        { model: Service, as: 'service', attributes: ['id', 'title', 'slug'], required: false },
        { model: Page, as: 'page', attributes: ['id', 'slug', 'sections', 'updatedAt'] },
        { model: LandingPageVersion, as: 'publishedVersion', attributes: ['id', 'version', 'createdAt'], required: false },
        { model: User, as: 'creator', attributes: USER_ATTRS, required: false },
        { model: User, as: 'updater', attributes: USER_ATTRS, required: false },
      ],
    });
    if (!row) fail(404, 'Landing page not found');
    const data = toAdmin(row);
    data.sections = normalizeSections(row.page?.sections || []);
    delete data.page;
    data.versionCount = await LandingPageVersion.count({ where: { landingPageId: id } });
    return data;
  }

  async create(body, user) {
    const errors = [];
    const title = text(body.title);
    if (!title) errors.push({ field: 'title', message: 'Title is required' });
    else if (title.length > 255) errors.push({ field: 'title', message: 'Title must be at most 255 characters' });

    const slug = text(body.slug).toLowerCase();
    const slugIssue = await this.slugProblem(slug);
    if (slugIssue) errors.push({ field: 'slug', message: slugIssue });

    const serviceId = text(body.serviceId) || null;
    if (serviceId && !(await Service.findByPk(serviceId, { attributes: ['id'] }))) errors.push({ field: 'serviceId', message: 'Service not found' });
    if (body.copyServiceBlocks && !serviceId) errors.push({ field: 'serviceId', message: 'Pick a service to copy its blocks' });

    const seo = seoFrom(body, errors);
    let sections = normalizeSections(Array.isArray(body.sections) ? body.sections : []);
    if (body.copyServiceBlocks && serviceId && !errors.length) {
      // Header from the template, then the service's blocks, then the template's footer.
      const header = sections.filter((s) => s.type === HEADER_TYPE);
      const footer = sections.filter((s) => s.type === FOOTER_TYPE);
      sections = [...header, ...(await serviceBlocks(serviceId)), ...footer];
    }
    errors.push(...validateSections(sections));
    if (errors.length) fail(422, 'Validation Error', errors);

    return sequelize.transaction(async (transaction) => {
      const page = await Page.create({ title, slug: `${PAGE_SLUG_PREFIX}${slug}`, status: 'draft', sections, robots: 'noindex, nofollow' }, { transaction });
      const row = await LandingPage.create({
        title, slug, serviceId, pageId: page.id, ...seo,
        status: 'draft', draftUpdatedAt: new Date(), createdBy: user?.id || null, updatedBy: user?.id || null,
      }, { transaction });
      return toAdmin(row);
    }).then((row) => this.getById(row.id));
  }

  /** Title, service, SEO and (while not live) the subdomain. */
  async updateSettings(id, body, user) {
    const row = await this.find(id);
    const errors = [];
    const changes = {};

    if (body.title !== undefined) {
      const title = text(body.title);
      if (!title) errors.push({ field: 'title', message: 'Title is required' });
      else if (title.length > 255) errors.push({ field: 'title', message: 'Title must be at most 255 characters' });
      else changes.title = title;
    }
    if (body.serviceId !== undefined) {
      const serviceId = text(body.serviceId) || null;
      if (serviceId && !(await Service.findByPk(serviceId, { attributes: ['id'] }))) errors.push({ field: 'serviceId', message: 'Service not found' });
      else changes.serviceId = serviceId;
    }
    if (body.slug !== undefined && text(body.slug).toLowerCase() !== row.slug) {
      const slug = text(body.slug).toLowerCase();
      if (row.status === 'published') errors.push({ field: 'slug', message: 'Unpublish the page before changing its subdomain (the live address would break)' });
      else {
        const issue = await this.slugProblem(slug, id);
        if (issue) errors.push({ field: 'slug', message: issue });
        else changes.slug = slug;
      }
    }
    Object.assign(changes, seoFrom(body, errors));
    if (errors.length) fail(422, 'Validation Error', errors);

    await sequelize.transaction(async (transaction) => {
      await row.update({ ...changes, updatedBy: user?.id || null }, { transaction });
      const pageChanges = {};
      if (changes.title) pageChanges.title = changes.title;
      if (changes.slug) pageChanges.slug = `${PAGE_SLUG_PREFIX}${changes.slug}`;
      if (Object.keys(pageChanges).length) await Page.update(pageChanges, { where: { id: row.pageId }, transaction, individualHooks: true });
    });
    return this.getById(id);
  }

  /** Saves the builder blocks into the draft page. The live version is not touched. */
  async saveDraft(id, sections, user) {
    const row = await this.find(id);
    if (row.status === 'archived') fail(409, 'This landing page is archived. Restore it before editing.');
    const normalized = normalizeSections(sections);
    const errors = validateSections(Array.isArray(sections) ? sections : null);
    if (errors.length) fail(422, 'Validation Error', errors);

    const now = new Date();
    await sequelize.transaction(async (transaction) => {
      const page = await Page.findByPk(row.pageId, { transaction });
      if (!page) fail(409, 'The draft page of this landing page is missing');
      await page.update({ sections: normalized }, { transaction });
      await row.update({ draftUpdatedAt: now, updatedBy: user?.id || null }, { transaction });
    });
    return this.getById(id);
  }

  /** Errors that block publishing: block structure plus missing / inactive forms and packages. */
  async validateForPublish(row, sections) {
    const errors = [];
    if (!text(row.title)) errors.push({ field: 'title', message: 'Title is required' });
    const slugIssue = subdomainError(row.slug);
    if (slugIssue) errors.push({ field: 'slug', message: slugIssue });
    errors.push(...validateSections(sections, { strict: true }));

    const { formIds, packageIds } = referencesOf(sections);
    if (formIds.length) {
      const active = new Set((await Form.findAll({ where: { id: formIds, status: 'active' }, attributes: ['id'] })).map((f) => f.id));
      formIds.filter((fid) => !active.has(fid)).forEach((fid) => errors.push({ field: 'sections', message: `A form on the page is missing or inactive (${fid})` }));
    }
    if (packageIds.length) {
      const active = new Set((await Package.findAll({ where: { id: packageIds, status: 'active' }, attributes: ['id'] })).map((p) => p.id));
      packageIds.filter((pid) => !active.has(pid)).forEach((pid) => errors.push({ field: 'sections', message: `A package on the page is missing or inactive (${pid})` }));
    }
    return errors;
  }

  /** Snapshot the draft as a new version and make it live, atomically. */
  async publish(id, user) {
    const result = await sequelize.transaction(async (transaction) => {
      const row = await this.find(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (row.status === 'archived') fail(409, 'Restore this archived landing page before publishing it.');
      const page = await Page.findByPk(row.pageId, { transaction });
      const sections = normalizeSections(page?.sections || []);
      const errors = await this.validateForPublish(row, sections);
      if (errors.length) fail(422, 'The page cannot be published yet', errors);

      const last = await LandingPageVersion.max('version', { where: { landingPageId: id }, transaction });
      const version = await LandingPageVersion.create({
        landingPageId: id,
        version: (Number(last) || 0) + 1,
        title: row.title,
        slug: row.slug,
        serviceId: row.serviceId,
        sections,
        seo: Object.fromEntries(SEO_FIELDS.map((key) => [key, row[key] || null])),
        publishedBy: user?.id || null,
      }, { transaction });
      await row.update({
        status: 'published', publishedVersionId: version.id, publishedAt: new Date(), updatedBy: user?.id || null,
        // The draft now equals the live version; the next draft save sets it again.
        draftUpdatedAt: null,
      }, { transaction });
      return row.id;
    });
    return this.getById(result);
  }

  async unpublish(id, user) {
    const row = await this.find(id);
    if (row.status !== 'published') fail(409, 'This landing page is not published');
    await row.update({ status: 'draft', publishedVersionId: null, updatedBy: user?.id || null });
    return this.getById(id);
  }

  async archive(id, user) {
    const row = await this.find(id);
    if (row.status === 'archived') fail(409, 'This landing page is already archived');
    await row.update({ status: 'archived', publishedVersionId: null, updatedBy: user?.id || null });
    return this.getById(id);
  }

  async unarchive(id, user) {
    const row = await this.find(id);
    if (row.status !== 'archived') fail(409, 'This landing page is not archived');
    await row.update({ status: 'draft', updatedBy: user?.id || null });
    return this.getById(id);
  }

  async versions(id) {
    await this.find(id);
    const rows = await LandingPageVersion.findAll({
      where: { landingPageId: id },
      attributes: ['id', 'version', 'title', 'slug', 'createdAt', 'publishedBy'],
      include: [{ model: User, as: 'publisher', attributes: USER_ATTRS, required: false }],
      order: [['version', 'DESC']],
    });
    return rows.map((v) => ({ id: v.id, version: v.version, title: v.title, slug: v.slug, createdAt: v.createdAt, publishedByName: userName(v.publisher) }));
  }

  /** Copies a published version's blocks back into the draft (the live page is unchanged). */
  async restoreVersion(id, versionId, user) {
    const version = await LandingPageVersion.findOne({ where: { id: versionId, landingPageId: id } });
    if (!version) fail(404, 'Version not found');
    return this.saveDraft(id, version.sections, user);
  }

  /**
   * Deletes an old published version for good. The live version cannot be deleted (publish
   * another one or unpublish first). Version numbers of the others stay as they are.
   */
  async deleteVersion(id, versionId) {
    const row = await this.find(id);
    const version = await LandingPageVersion.findOne({ where: { id: versionId, landingPageId: id }, attributes: ['id', 'version', 'title'] });
    if (!version) fail(404, 'Version not found');
    if (row.publishedVersionId === version.id) fail(409, `Version ${version.version} is live. Publish another version or unpublish the page first.`);
    await version.destroy();
    // Versions are not audited row by row (big snapshots); log the deletion on the landing page.
    const AuditLogService = require('./AuditLogService');
    await AuditLogService.record({
      action: 'DELETE',
      module: 'Landing Pages',
      recordId: id,
      description: `Deleted version ${version.version} of landing page "${row.title}"`,
    });
    return this.versions(id);
  }

  /** The saved draft, hydrated like the live page (admin preview of the saved state). */
  async preview(id) {
    const row = await this.getById(id);
    return this.toPublic(row, normalizeSections(row.sections), { draft: true });
  }

  async toPublic(row, sections, extra = {}) {
    const service = row.serviceId ? await Service.findByPk(row.serviceId, { attributes: ['id', 'title', 'slug'] }) : null;
    return {
      slug: row.slug,
      url: landingUrl(row.slug),
      title: row.title,
      seo: row.seo || Object.fromEntries(SEO_FIELDS.map((key) => [key, row[key] || null])),
      service: service ? service.toJSON() : null,
      sections: await SectionHydrator.hydrateSections(sections),
      ...extra,
    };
  }

  /**
   * Public: the live version for a hostname ("cbdt.taxalphonic.com", checked against
   * LANDING_BASE_DOMAINS) or a bare label. Null for anything that is not a published page.
   */
  async resolvePublic({ host, slug }) {
    const label = host ? labelFromHost(host) : (subdomainError(text(slug).toLowerCase()) ? null : text(slug).toLowerCase());
    if (!label) return null;
    const row = await LandingPage.findOne({
      where: { slug: label, status: 'published', publishedVersionId: { [Op.ne]: null } },
      include: [{ model: LandingPageVersion, as: 'publishedVersion', required: true }],
    });
    if (!row) return null;
    const version = row.publishedVersion;
    return this.toPublic(
      { slug: row.slug, title: version.title, serviceId: version.serviceId, seo: version.seo },
      normalizeSections(version.sections),
      { version: version.version, publishedAt: row.publishedAt }
    );
  }
}

module.exports = new LandingPageService();
module.exports.LandingPageError = LandingPageError;
module.exports.PAGE_SLUG_PREFIX = PAGE_SLUG_PREFIX;
