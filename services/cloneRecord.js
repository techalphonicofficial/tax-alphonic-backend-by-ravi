const { normalizeSlug, reservedReason, findConflict } = require('./slugRegistry');

/*
 * Clone a service or a CMS page (POST /services/:id/clone, POST /pages/:id/clone): the copy is a
 * DRAFT with "<title> (Copy)" and a free slug "<slug>-copy" ("-copy-2", ...), everything else
 * (content, blocks, SEO texts, images, category) kept, so an editor changes only what differs.
 * Never copied: ids / timestamps / trash state, the publish date, "featured", and the canonical URL
 * (it would point search engines at the original page).
 */

const NEVER_COPIED = ['id', 'slug', 'title', 'status', 'createdAt', 'updatedAt', 'deletedAt', 'publishDate', 'publishedAt', 'canonicalUrl'];

/** "GST Registration" → "GST Registration (Copy)", within the 255-character title limit. */
function copyTitle(title) {
  const base = String(title || 'Untitled').trim();
  const suffix = ' (Copy)';
  return `${base.slice(0, 255 - suffix.length)}${suffix}`;
}

/** Slug candidates for a copy: "<slug>-copy", "<slug>-copy-2", "<slug>-copy-3", ... */
function copySlugCandidates(slug, count = 50) {
  const base = normalizeSlug(slug).replace(/-copy(?:-\d+)?$/, '') || 'page';
  const trimmed = base.slice(0, 240);
  return Array.from({ length: count }, (_, i) => (i === 0 ? `${trimmed}-copy` : `${trimmed}-copy-${i + 1}`));
}

/** The first free copy slug for `kind` (slugRegistry kinds: "service", "page"). */
async function freeCopySlug(kind, slug, { transaction = null } = {}) {
  for (const candidate of copySlugCandidates(slug)) {
    if (reservedReason(kind, candidate)) continue;
    if (!(await findConflict(kind, candidate, { transaction }))) return candidate;
  }
  const err = new Error('Could not find a free slug for the copy. Rename the earlier copies first.');
  err.status = 409;
  throw err;
}

/** The attributes of `source` (a plain object) for the copy, without the never-copied ones. */
function copyFields(source, extraDrop = []) {
  const drop = new Set([...NEVER_COPIED, ...extraDrop]);
  return Object.fromEntries(Object.entries(source || {}).filter(([key]) => !drop.has(key)));
}

module.exports = { copyTitle, copySlugCandidates, freeCopySlug, copyFields, NEVER_COPIED };
