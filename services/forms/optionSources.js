const { Op } = require('sequelize');

/*
 * Dropdown / radio / checkbox options filled from site data (Form Builder "Options from").
 * A field with `optionsSource` gets its options when the form is sent to the website and when a
 * submission is checked, so a newly published service (landing page, ...) shows up by itself.
 * Option value = the record's name, so CRM leads read "GST Registration", not an id.
 * Lists are cached for a minute (forms are loaded on many pages).
 */

const CACHE_MS = 60 * 1000;
const cache = new Map(); // key -> { at, options }

const models = () => require('../../models');
const byName = (rows, key) => rows.map((r) => String(r[key] || '').trim()).filter(Boolean);

const SOURCES = {
  services: {
    label: 'Services',
    filter: 'categoryId', // optional: only the services of one category
    async load({ categoryId } = {}) {
      const where = { status: 'published' };
      if (categoryId) where.categoryId = categoryId;
      return byName(await models().Service.findAll({ where, attributes: ['title'], order: [['sortOrder', 'ASC'], ['title', 'ASC']], raw: true }), 'title');
    },
  },
  service_categories: {
    label: 'Service categories',
    async load() {
      return byName(await models().ServiceCategory.findAll({ where: { status: 'published' }, attributes: ['name'], order: [['name', 'ASC']], raw: true }), 'name');
    },
  },
  landing_pages: {
    label: 'Landing pages',
    async load() {
      return byName(await models().LandingPage.findAll({ where: { status: 'published' }, attributes: ['title'], order: [['title', 'ASC']], raw: true }), 'title');
    },
  },
  pages: {
    label: 'CMS pages',
    async load() {
      return byName(await models().Page.findAll({ where: { status: 'published', slug: { [Op.ne]: 'home' } }, attributes: ['title'], order: [['title', 'ASC']], raw: true }), 'title');
    },
  },
  countries: {
    label: 'Countries',
    async load() {
      return byName(await models().Country.findAll({ where: { status: 'active' }, attributes: ['name'], order: [['name', 'ASC']], raw: true }), 'name');
    },
  },
  states: {
    label: 'States',
    async load() {
      return byName(await models().State.findAll({ where: { status: 'active' }, attributes: ['name'], order: [['name', 'ASC']], raw: true }), 'name');
    },
  },
  locations: {
    label: 'Cities / locations',
    async load() {
      return byName(await models().Location.findAll({ where: { active: true }, attributes: ['name'], order: [['name', 'ASC']], raw: true }), 'name');
    },
  },
  industries: {
    label: 'Industries',
    async load() {
      return byName(await models().Industry.findAll({ where: { active: true }, attributes: ['name'], order: [['name', 'ASC']], raw: true }), 'name');
    },
  },
};

const isSource = (key) => Object.prototype.hasOwnProperty.call(SOURCES, key);

/** Only the filter keys the source understands, as strings. */
function cleanFilter(source, filter) {
  const key = SOURCES[source]?.filter;
  const value = key && filter && typeof filter === 'object' ? String(filter[key] || '').trim() : '';
  return value ? { [key]: value } : {};
}

// Only published / active rows are listed. Any save or delete on a source table (publish, move to
// draft, archive, ...) clears the cache, so the change shows in forms on the next load.
const SOURCE_MODELS = ['Service', 'ServiceCategory', 'LandingPage', 'Page', 'Country', 'State', 'Location', 'Industry'];
let hooked = false;
function watchSources() {
  if (hooked) return;
  hooked = true;
  const all = models();
  SOURCE_MODELS.forEach((name) => {
    const model = all[name];
    if (!model?.addHook) return;
    ['afterCreate', 'afterUpdate', 'afterDestroy', 'afterRestore', 'afterBulkCreate', 'afterBulkUpdate', 'afterBulkDestroy', 'afterBulkRestore']
      .forEach((hook) => model.addHook(hook, 'formOptionSourcesCache', () => cache.clear()));
  });
}

/** [{ label, value }] for a source (unique names), [] for an unknown one. */
async function optionsFor(source, filter) {
  if (!isSource(source)) return [];
  watchSources();
  const clean = cleanFilter(source, filter);
  const key = `${source}:${JSON.stringify(clean)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.options;
  const names = [...new Set(await SOURCES[source].load(clean))];
  const options = names.map((name) => ({ label: name, value: name }));
  cache.set(key, { at: Date.now(), options });
  return options;
}

/**
 * Fields with their live options: the source's list, then the hand-written options
 * (e.g. "Other"), duplicates dropped. Fields without a source are returned as they are.
 */
async function withLiveOptions(fields) {
  return Promise.all((fields || []).map(async (field) => {
    if (!field || !isSource(field.optionsSource)) return field;
    try {
      const seen = new Set();
      const options = [...await optionsFor(field.optionsSource, field.optionsFilter), ...(field.options || [])]
        .filter((o) => !seen.has(o.value) && seen.add(o.value));
      return { ...field, options };
    } catch {
      return field; // keep the form working with the hand-written options
    }
  }));
}

/** For the Form Builder: every source with its label, filter and current count. */
async function listSources() {
  return Promise.all(Object.entries(SOURCES).map(async ([key, source]) => ({
    key,
    label: source.label,
    filter: source.filter || null,
    count: (await optionsFor(key).catch(() => [])).length,
  })));
}

const clearCache = () => cache.clear();

module.exports = { SOURCES, isSource, cleanFilter, optionsFor, withLiveOptions, listSources, clearCache };
