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
 * Deleting frees the slug (2026-11-12): a record moved to Trash gets the stored slug
 * "~trash-<time>-<slug>" (TRASH_RE), so a new record can use the slug at once; restoring puts the
 * original back, or "<slug>-2" … when it was taken meanwhile. Rows trashed before this change still
 * hold their plain slug: they are released the moment another record asks for it (assertSlugFree).
 * Deleting a live record also adds its path to the gone list (goneUrls.js → website 410), and a
 * service / page / pSEO page linked in a website menu cannot be deleted until the link is changed.
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

const TRASH_RE = /^~trash-[a-z0-9]+-/;
/** The slug a trashed row had ("~trash-…-gst" → "gst"); other slugs unchanged. */
const originalSlug = (slug) => String(slug ?? '').replace(TRASH_RE, '');
const isTrashedSlug = (slug) => TRASH_RE.test(String(slug ?? ''));
const trashedSlug = (slug) => `~trash-${Date.now().toString(36)}-${originalSlug(slug)}`.slice(0, 255);
/** Website path of a record ('' when it has none). */
function sitePath(kind, slug) {
  const clean = normalizeSlug(originalSlug(slug));
  if (!clean) return '';
  if (kind === 'blog') return `/blog/${clean}`;
  if (KINDS[kind]?.ns !== 'site') return '';
  if (clean === 'home' || clean.startsWith('landing-page/')) return '';
  return `/${clean}`;
}
const isLive = (row) => /^published$/i.test(String(row?.status || ''));

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
async function findConflict(kind, slug, { id = null, transaction = null, ignoreTrashed = false } = {}) {
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
      paranoid: ignoreTrashed,
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
  // A record in Trash gives its slug up when this one is saved (assertSlugFree).
  if (conflict.trashed) {
    return { slug: clean, available: true, reason: `Free: the ${conflict.label} "${conflict.name}" that used it is in Trash and gives it up when you save.`, conflict, suggestion: '' };
  }
  return { slug: clean, available: false, reason: conflictMessage(clean, conflict), conflict, suggestion: await suggestSlug(kind, clean, options) };
}

/** Throws a 409 error when `slug` cannot be used (reserved unless `allowReserved`, or taken). */
async function assertSlugFree(kind, slug, { id = null, transaction = null, allowReserved = false } = {}) {
  const clean = normalizeSlug(slug);
  if (!clean || !isKind(kind)) return;
  const reserved = allowReserved ? '' : reservedReason(kind, clean);
  let conflict = reserved ? null : await findConflict(kind, clean, { id, transaction });
  if (!reserved && conflict?.trashed) {
    await releaseTrashed(conflict, transaction);
    conflict = await findConflict(kind, clean, { id, transaction });
  }
  if (!reserved && !conflict) return;
  const err = new Error(reserved || conflictMessage(clean, conflict));
  err.status = 409;
  err.code = 'SLUG_TAKEN';
  err.errors = [{ field: 'slug', message: err.message }];
  throw err;
}

/** Gives up the plain slug of a row trashed before slugs were freed on delete. */
async function releaseTrashed(conflict, transaction) {
  const Model = models()[KINDS[conflict.type].model];
  if (!Model) return;
  await Model.update({ slug: trashedSlug(conflict.slug) }, { where: { id: conflict.id }, paranoid: false, hooks: false, validate: false, transaction });
}

/** Website menu items that link to `path` (header / footer …): [{ menu, title }]. */
async function menuLinksTo(path, transaction) {
  const clean = normalizeSlug(path);
  if (!clean) return [];
  const { MenuItem, Menu, Sequelize } = models();
  if (!MenuItem) return [];
  const { Op } = Sequelize;
  const variants = [`/${clean}`, `/${clean}/`, clean, `${clean}/`];
  const items = await MenuItem.findAll({
    where: { [Op.or]: [{ url: { [Op.in]: variants } }, { url: { [Op.like]: `%taxalphonic.com/${clean}` } }, { url: { [Op.like]: `%taxalphonic.com/${clean}/` } }] },
    attributes: ['id', 'title', 'menuId'],
    transaction,
  });
  if (!items.length) return [];
  const menus = Menu ? await Menu.findAll({ where: { id: [...new Set(items.map((i) => i.menuId))] }, attributes: ['id', 'name', 'location'], transaction }) : [];
  const nameOf = (id) => { const m = menus.find((x) => x.id === id); return m ? (m.name || m.location || 'Menu') : 'Menu'; };
  return items.map((i) => ({ menu: nameOf(i.menuId), title: i.title }));
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
    // A row trashed with a freed slug gets its slug back in afterRestore (or "<slug>-2" if taken).
    Model.addHook('beforeRestore', 'slugRegistry', (row, options) => (isTrashedSlug(row.slug) ? undefined
      : assertSlugFree(kind, row.slug, { id: row.id, transaction: options?.transaction, allowReserved: true })));

    // Bulk deletes / restores run the per-row hooks too.
    Model.addHook('beforeBulkDestroy', 'slugRegistry', (options) => { options.individualHooks = true; });
    Model.addHook('beforeBulkRestore', 'slugRegistry', (options) => { options.individualHooks = true; });

    // A page linked in a website menu is not deleted: the menu link would lead nowhere.
    if (KINDS[kind].ns === 'site') {
      Model.addHook('beforeDestroy', 'slugRegistry', async (row, options) => {
        if (isTrashedSlug(row.slug) || options?.skipMenuCheck) return;
        const path = sitePath(kind, row.slug);
        if (!path) return;
        const links = await menuLinksTo(path, options?.transaction);
        if (!links.length) return;
        const where = links.slice(0, 5).map((l) => `${l.menu} › ${l.title}`).join(', ');
        const err = new Error(`"${row.title || row.slug}" is linked in the website menu (${where}${links.length > 5 ? ', …' : ''}). Change or remove that menu link in Menus & Navigation first, then delete it.`);
        err.status = 409;
        err.code = 'MENU_LINKED';
        err.errors = [{ field: 'menu', message: err.message }];
        throw err;
      });
    }

    // Deleted: the slug is freed (Trash) and a live page's path answers 410 on the website.
    Model.addHook('afterDestroy', 'slugRegistry', async (row, options) => {
      const transaction = options?.transaction;
      const path = sitePath(kind, row.slug);
      if (path && isLive(row)) await require('./goneUrls').addGone(path, { kind, title: row.title || row.name }, transaction);
      if (!options?.force && Model.options?.paranoid && !isTrashedSlug(row.slug)) {
        await Model.update({ slug: trashedSlug(row.slug) }, { where: { id: row.id }, paranoid: false, hooks: false, validate: false, transaction });
      }
    });

    Model.addHook('afterRestore', 'slugRegistry', async (row, options) => {
      const transaction = options?.transaction;
      if (!isTrashedSlug(row.slug)) return;
      const wanted = originalSlug(row.slug);
      const taken = await findConflict(kind, wanted, { id: row.id, transaction, ignoreTrashed: true });
      const slug = taken || reservedReason(kind, wanted) ? (await suggestSlug(kind, wanted, { id: row.id, transaction })) || `${wanted}-${Date.now().toString(36)}` : wanted;
      await Model.update({ slug }, { where: { id: row.id }, paranoid: false, hooks: false, validate: false, transaction });
      row.slug = slug;
      if (isLive(row)) await require('./goneUrls').removeGone(sitePath(kind, slug), transaction);
    });

    // Live again at a path: it is no longer gone.
    Model.addHook('afterSave', 'slugRegistry', async (row, options) => {
      if (!isLive(row) || isTrashedSlug(row.slug)) return;
      const path = sitePath(kind, row.slug);
      if (path) await require('./goneUrls').removeGone(path, options?.transaction);
    });
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
  originalSlug,
  isTrashedSlug,
  sitePath,
  menuLinksTo,
};
