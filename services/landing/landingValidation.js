// Checks a landing page's Page Builder blocks before they are published (and, more loosely,
// when a draft is saved). Pure functions: no database access, so they are unit-tested
// (tests/landing.test.js). Records the blocks point to (forms, packages) are checked by
// LandingPageService.validateForPublish with `referencesOf`.

// Header / footer regions of a landing page (admin: landingBlocks.js, website: landingBlockTypes.js).
const HEADER_TYPE = 'LandingHeader';
const FOOTER_TYPE = 'LandingFooter';
const REGION_MODES = ['site', 'simple', 'none'];

const MAX_BLOCKS = 150;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const TYPE_PATTERN = /^[A-Z][A-Za-z0-9]{1,59}$/;
// Keys whose string value is used as a link or a media source by the website.
const URL_KEY = /(^|[a-z])(url|href|link|src|image|logo|icon|poster|avatar|photo|video)$/i;
const BAD_SCHEME = /^\s*(javascript|vbscript|data:text\/html)\s*:?/i;

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Button / link URLs that open a CMS form in a popup on the website (lib/formPopup.js there):
// "#form-<form id>" = that form, "#form" = the page's own form (first Form block).
const POPUP_URL = /^#form(?:-([A-Za-z0-9_-]{1,64}))?$/;

/** Form ids of the popup URLs in a payload ("" = the page's own form). */
function popupForms(value, out = []) {
  if (typeof value === 'string') {
    const match = POPUP_URL.exec(value.trim());
    if (match) out.push(match[1] || '');
  } else if (Array.isArray(value)) {
    value.forEach((item) => popupForms(item, out));
  } else if (isObject(value)) {
    Object.values(value).forEach((item) => popupForms(item, out));
  }
  return out;
}

/** A block's payload, whether stored as { data: { payload } } (admin) or { payload } (website). */
function payloadOf(section) {
  let payload = section?.data?.payload ?? section?.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  return payload;
}

/** Walks a payload and reports link / media values with a script scheme. */
function unsafeLinks(value, path, out) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => unsafeLinks(item, `${path}[${i}]`, out));
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      const here = `${path}.${key}`;
      if (typeof item === 'string' && URL_KEY.test(key) && BAD_SCHEME.test(item)) out.push(here);
      else unsafeLinks(item, here, out);
    });
  }
  return out;
}

/**
 * Errors ([{ field, message }]) for a block list. `strict` (publish) also requires a body
 * block and complete Header / Footer settings; a draft save only rejects what could never be
 * stored or rendered safely.
 */
function validateSections(sections, { strict = false } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });

  if (!Array.isArray(sections)) {
    add('sections', 'Sections must be an array');
    return errors;
  }
  if (sections.length > MAX_BLOCKS) add('sections', `A landing page can have at most ${MAX_BLOCKS} blocks`);
  if (Buffer.byteLength(JSON.stringify(sections), 'utf8') > MAX_JSON_BYTES) {
    add('sections', 'The page content is too large (over 2 MB). Use Media images instead of pasted data.');
  }

  const ids = new Set();
  let headers = 0;
  let footers = 0;
  let heroes = 0;
  let body = 0;
  let pageForm = false;
  let usesPageForm = false;

  sections.forEach((section, index) => {
    const at = `sections[${index}]`;
    if (!isObject(section)) {
      add(at, 'Each block must be an object');
      return;
    }
    const type = typeof section.type === 'string' ? section.type : section.type?.componentKey;
    if (typeof type !== 'string' || !TYPE_PATTERN.test(type)) {
      add(`${at}.type`, 'Unknown block type');
      return;
    }
    const id = String(section.id ?? '');
    if (!id || id.length > 100) add(`${at}.id`, 'Each block needs an id (max 100 characters)');
    else if (ids.has(id)) add(`${at}.id`, `Two blocks share the id "${id}"`);
    ids.add(id);

    if (section.config !== undefined && section.config !== null && !isObject(section.config) && typeof section.config !== 'string') {
      add(`${at}.config`, 'Block settings must be an object');
    }
    const payload = payloadOf(section);
    if (payload !== undefined && payload !== null && !isObject(payload)) {
      add(`${at}.payload`, 'Block content must be an object');
      return;
    }
    if (popupForms(payload || {}).includes('')) usesPageForm = true;
    unsafeLinks(payload || {}, `${at}.payload`, []).forEach((field) => add(field, 'Links and media must use http(s), a site path, # anchor, mailto: or tel:'));
    unsafeLinks(isObject(section.config) ? section.config : {}, `${at}.config`, []).forEach((field) => add(field, 'Background images must use http(s) or a Media path'));

    if (type === HEADER_TYPE || type === FOOTER_TYPE) {
      if (type === HEADER_TYPE) headers += 1; else footers += 1;
      const mode = payload?.mode ?? 'site';
      if (!REGION_MODES.includes(mode)) add(`${at}.payload.mode`, `${type === HEADER_TYPE ? 'Header' : 'Footer'} style must be one of ${REGION_MODES.join(', ')}`);
      return;
    }

    body += 1;
    if (type === 'Form' && (payload?.formId || payload?.form?.id)) pageForm = true;
    if (type === 'HeroBanner') heroes += 1;
    if (strict && type === 'Form' && !(payload?.formId || payload?.form?.id)) add(`${at}.payload.formId`, 'The Form block has no form selected');
    if (strict && type === 'Packages' && !(Array.isArray(payload?.packageIds) && payload.packageIds.length)) {
      add(`${at}.payload.packageIds`, 'The Packages block has no package selected');
    }
  });

  if (headers > 1) add('sections', 'A landing page can have only one Header block');
  if (footers > 1) add('sections', 'A landing page can have only one Footer block');
  if (heroes > 1) add('sections', 'A landing page can have only one Hero Banner');
  if (strict && usesPageForm && !pageForm) {
    add('sections', 'A button opens "the form on this page" in a popup, but the page has no Form block with a form selected');
  }
  if (strict && body === 0) add('sections', 'Add at least one content block to the page body before publishing');
  return errors;
}

/** Form and package ids the blocks point to, for the existence check before publishing. */
function referencesOf(sections) {
  const formIds = new Set();
  const packageIds = new Set();
  (Array.isArray(sections) ? sections : []).forEach((section) => {
    const payload = payloadOf(section);
    if (!isObject(payload)) return;
    if (payload.formId) formIds.add(String(payload.formId));
    popupForms(payload).filter(Boolean).forEach((id) => formIds.add(id));
    if (Array.isArray(payload.packageIds)) payload.packageIds.filter(Boolean).forEach((id) => packageIds.add(String(id)));
  });
  return { formIds: [...formIds], packageIds: [...packageIds] };
}

/** Stored shape of a block: { id, type, config, data: { payload } } (the Page Builder's). */
function normalizeSections(sections) {
  return (Array.isArray(sections) ? sections : []).map((section) => {
    const type = typeof section.type === 'string' ? section.type : section.type?.componentKey;
    let config = section.config ?? {};
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch { config = {}; }
    }
    return { id: String(section.id), type, config: isObject(config) ? config : {}, data: { payload: payloadOf(section) || {} } };
  });
}

module.exports = { HEADER_TYPE, FOOTER_TYPE, REGION_MODES, validateSections, referencesOf, normalizeSections, payloadOf, popupForms };
