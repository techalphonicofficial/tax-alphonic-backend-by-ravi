/*
 * Gone URLs (2026-11-12): website paths of deleted pages, so the website answers them with
 * "410 Gone" (permanently removed) instead of a normal "not found". Search engines drop a 410 URL
 * from their index faster than a 404.
 *
 * - A live (published) service, CMS page, pSEO page or blog post that is deleted (to Trash or for
 *   good) adds its path here (slugRegistry.js hooks).
 * - Restoring it, or any live record taking that path again, removes the path.
 * - Kept as one JSON setting (group "seo", key "goneUrls"; no extra table): [{ path, kind, title, at }].
 * - Public list: GET /api/v1/seo/gone-urls (routes/seoRoutes.js), read by the website's proxy.js.
 */
const GROUP = 'seo';
const KEY = 'goneUrls';
const MAX = 5000;

let modelsCache = null;
const models = () => (modelsCache ||= require('../models'));

/** "/India/GST/" → "/india/gst" (the form the website compares). */
function normalizePath(value) {
  const clean = String(value ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  return clean ? `/${clean}` : '';
}

async function read(transaction) {
  const row = await models().Setting.findOne({ where: { group: GROUP, key: KEY }, transaction });
  if (!row) return [];
  try {
    const list = JSON.parse(row.value || '[]');
    return Array.isArray(list) ? list.filter((e) => e && e.path) : [];
  } catch {
    return [];
  }
}

async function write(list, transaction) {
  const { Setting } = models();
  const value = JSON.stringify(list.slice(-MAX));
  const row = await Setting.findOne({ where: { group: GROUP, key: KEY }, transaction });
  if (row) await row.update({ value }, { transaction, hooks: false });
  else await Setting.create({ group: GROUP, key: KEY, value, type: 'json', isPublic: false }, { transaction, hooks: false });
}

// One change at a time, so two deletes at once never lose an entry.
let queue = Promise.resolve();
const serial = (job) => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

/** Adds a deleted page's path (an existing entry is refreshed). */
function addGone(path, { kind = '', title = '' } = {}, transaction = null) {
  const clean = normalizePath(path);
  if (!clean || clean === '/') return Promise.resolve();
  return serial(async () => {
    const list = (await read(transaction)).filter((e) => e.path !== clean);
    list.push({ path: clean, kind, title: String(title || '').slice(0, 200), at: new Date().toISOString() });
    await write(list, transaction);
  });
}

/** Takes a path off the list (the page is live again). */
function removeGone(path, transaction = null) {
  const clean = normalizePath(path);
  if (!clean) return Promise.resolve();
  return serial(async () => {
    const list = await read(transaction);
    const next = list.filter((e) => e.path !== clean);
    if (next.length !== list.length) await write(next, transaction);
  });
}

/** Every gone path (for the website). */
async function listGone() {
  return (await read()).map((e) => e.path);
}

/** Every entry with its details (admin). */
async function listGoneEntries() {
  return read();
}

module.exports = { addGone, removeGone, listGone, listGoneEntries, normalizePath };
