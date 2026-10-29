/*
 * One place that decides whether a slug is free, so two records never fight for the same URL.
 *
 * Namespaces (a slug must be unique inside its namespace):
 * - "site": services, CMS pages and pSEO pages. The website opens all three at taxalphonic.com/<slug>
 *   (app/[...slug]), so a service "xyz", a page "xyz" and a pSEO page "xyz" would hide each other.
 *   Paths the website itself uses (about, blog, explore, lp, sitemap.xml, ...) are reserved there.
 * - every other slugged table is its own namespace (blogs at /blog/<slug>, categories, tags,
 *   portfolio, forms). Landing pages have their own check (services/landing/subdomain.js).
 *
 * Trashed (soft-deleted) rows still hold their slug: restoring them must not clash, and the
 * database unique index counts them too.
 *
 * watchSlugs() adds model hooks (create, slug change, restore), so every code path is covered;
 * GET /slugs/check (routes/slugRoutes.js) lets the admin show the result while typing.
 */
const KINDS = {
  service: { model: 'Service', label: 'Service', name: 'title', ns: 'site', admin: (id) => `/services/edit/${id}` },
  page: { model: 'Page', label: 'Page', name: 'title', ns: 'site', admin: (id) => `/pages/edit/${id}` },
  seo_page: { model: 'Seopage', label: 'SEO Page', name: 'title', ns: 'site', admin: (id) => `/seo-pages/edit/${id}` },
  blog: { model: 'Blog', label: 'Blog', name: 'title', ns: 'blog', admin: (id) => `/blogs/edit/${id}` },
  service_category: { model: 'ServiceCategory', label: 'Service Category', name: 'name', ns: 'service_category', admin: (id) => `/service-categories/edit/${id}` },
  page_category: { model: 'PageCategory', label: 'Page Category', name: 'name', ns: 'page_category', admin: (id) => `/pages/categories/edit/${id}` },
  blog_category: { model: 'BlogCategory', label: 'Blog Category', name: 'name', ns: 'blog_category', admin: (id) => `/blog-categories/edit/${id}` },
  blog_tag: { model: 'BlogTag', label: 'Blog Tag', name: 'name', ns: 'blog_tag', admin: (id) => `/blog-tags/edit/${id}` },
  portfolio_category: { model: 'PortfolioCategory', label: 'Portfolio Category', name: 'name', ns: 'portfolio_category', admin: (id) => `/portfolio-categories/edit/${id}` },
  portfolio_item: { model: 'PortfolioItem', label: 'Portfolio Item', name: 'title', ns: 'portfolio_item', admin: (id) => `/portfolio-items/edit/${id}` },
  form: { model: 'Form', label: 'Form', name: 'name', ns: 'form', admin: (id) => `/forms/edit/${id}` },
};

// First path segments the website itself serves (keep in sync with the website's app/ folder and proxy.js).
const RESERVED_SITE = new Set([
  'about', 'blog', 'explore', 'lp', 'cms-preview', 'category', 'landing-host', 'landing-page',
  'sitemaps', 'sitemap.xml', 'robots.txt', 'api', '_next', 'uploads', 'favicon.ico', 'home',
]);

const isKind = (kind) => Object.prototype.hasOwnProperty.call(KINDS, kind);
const kindOfModel = (modelName) => Object.keys(KINDS).find((kind) => KINDS[kind].model === modelName) || null;

/** " /India/XYZ/ " → "india/xyz" (how the website compares paths). */
function normalizeSlug(value) {
  return String(value ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
}

/** Why `slug` cannot be used by `kind` whatever the data ('' when it may). */
function reservedReason(kind, slug) {
  const clean = normalizeSlug(slug);
  if (!clean || KINDS[kind]?.ns !== 'site') return '';
  const first = clean.split('/')[0];
  // The homepage is the CMS page "home"; landing page drafts are pages "landing-page/<name>" (LandingPageService).
  if (kind === 'page' && (clean === 'home' || first === 'landing-page')) return '';
  if (!RESERVED_SITE.has(first)) return '';
  return `"/${first}" is used by the website itself, so it cannot be used as a ${KINDS[kind].label} URL. Pick another slug.`;
}

let modelsCache = null;
const models = () => (modelsCache ||= require('../models'));

/** The first record of the same namespace (other than `id` of `kind`) that already uses `slug`, or null. */
async function findConflict(kind, slug, { id = null, transaction = null } = {}) {
  const clean = normalizeSlug(slug);
  if (!clean || !isKind(kind)) return null;
  const { ns } = KINDS[kind];
  const all = models();
  for (const other of Object.keys(KINDS)) {
    const config = KINDS[other];
    if (config.ns !== ns) continue;
    const Model = all[config.model];
    if (!Model) continue;
    const { Op } = all.Sequelize;
    const where = { slug: { [Op.in]: [clean, `/${clean}`, `${clean}/`, `/${clean}/`] } };
    if (other === kind && id != null && id !== '') where.id = { [Op.ne]: id };
    const row = await Model.findOne({
      where,
      paranoid: false,
      attributes: ['id', 'slug', config.name, ...(Model.rawAttributes.deletedAt ? ['deletedAt'] : [])],
      transaction,
    });
    if (row) {
      return {
        type: other,
        label: config.label,
        id: row.id,
        name: row[config.name] || row.slug,
        slug: row.slug,
        trashed: Boolean(row.deletedAt),
        adminUrl: config.admin(row.id),
      };
    }
  }
  return null;
}

/** The message shown for a conflict. */
function conflictMessage(slug, conflict) {
  const where = conflict.trashed ? ' (it is in Trash: restore it or delete it forever there, or pick another slug)' : '. Pick another slug';
  return `The slug "${normalizeSlug(slug)}" is already used by the ${conflict.label} "${conflict.name}"${where}.`;
}

/** A free variant of `slug` in the namespace of `kind` ("xyz-2", "xyz-3", ...). */
async function suggestSlug(kind, slug, options = {}) {
  const clean = normalizeSlug(slug);
  if (!clean) return '';
  for (let n = 2; n < 50; n += 1) {
    const candidate = `${clean}-${n}`;
    if (!reservedReason(kind, candidate) && !(await findConflict(kind, candidate, options))) return candidate;
  }
  return '';
}

/** { slug, available, reason, conflict, suggestion } for the admin's live check. */
async function checkSlug(kind, slug, options = {}) {
  const clean = normalizeSlug(slug);
  if (!isKind(kind)) {
    const err = new Error(`Unknown type "${kind}". Use one of: ${Object.keys(KINDS).join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (!clean) return { slug: clean, available: false, reason: 'Slug is required.', conflict: null, suggestion: '' };
  const reserved = reservedReason(kind, clean);
  if (reserved) return { slug: clean, available: false, reason: reserved, conflict: null, suggestion: await suggestSlug(kind, clean, options) };
  const conflict = await findConflict(kind, clean, options);
  if (!conflict) return { slug: clean, available: true, reason: '', conflict: null, suggestion: '' };
  return { slug: clean, available: false, reason: conflictMessage(clean, conflict), conflict, suggestion: await suggestSlug(kind, clean, options) };
}

/** Throws a 409 error when `slug` cannot be used (reserved unless `allowReserved`, or taken). */
async function assertSlugFree(kind, slug, { id = null, transaction = null, allowReserved = false } = {}) {
  const clean = normalizeSlug(slug);
  if (!clean || !isKind(kind)) return;
  const reserved = allowReserved ? '' : reservedReason(kind, clean);
  const conflict = reserved ? null : await findConflict(kind, clean, { id, transaction });
  if (!reserved && !conflict) return;
  const err = new Error(reserved || conflictMessage(clean, conflict));
  err.status = 409;
  err.code = 'SLUG_TAKEN';
  err.errors = [{ field: 'slug', message: err.message }];
  throw err;
}

let hooked = false;
/** Model hooks: a new record, a slug change and a restore from Trash are all checked. */
function watchSlugs() {
  if (hooked) return;
  hooked = true;
  const all = models();
  for (const kind of Object.keys(KINDS)) {
    const Model = all[KINDS[kind].model];
    if (!Model?.addHook) continue;
    Model.addHook('beforeCreate', 'slugRegistry', (row, options) =>
      assertSlugFree(kind, row.slug, { transaction: options?.transaction }));
    Model.addHook('beforeUpdate', 'slugRegistry', (row, options) => {
      // Only a changed slug: records saved before this check keep working.
      if (!row.changed('slug') || normalizeSlug(row.slug) === normalizeSlug(row.previous('slug'))) return undefined;
      return assertSlugFree(kind, row.slug, { id: row.id, transaction: options?.transaction });
    });
    Model.addHook('beforeBulkCreate', 'slugRegistry', async (rows, options) => {
      for (const row of rows) await assertSlugFree(kind, row.slug, { transaction: options?.transaction });
    });
    // Restoring is not a new URL choice: only a real clash blocks it, reserved words do not.
    Model.addHook('beforeRestore', 'slugRegistry', (row, options) =>
      assertSlugFree(kind, row.slug, { id: row.id, transaction: options?.transaction, allowReserved: true }));
  }
}

module.exports = {
  KINDS,
  RESERVED_SITE,
  normalizeSlug,
  reservedReason,
  findConflict,
  checkSlug,
  suggestSlug,
  assertSlugFree,
  conflictMessage,
  kindOfModel,
  watchSlugs,
};
