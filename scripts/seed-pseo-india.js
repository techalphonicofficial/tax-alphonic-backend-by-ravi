/**
 * Seeds the pSEO dimensions for India: all states / UTs, their main cities (Locations),
 * industries, technologies and problems relevant to Indian tax and compliance services.
 *
 *   node scripts/seed-pseo-india.js --dry-run   # only print what would happen
 *   node scripts/seed-pseo-india.js             # write
 *
 * Safe to re-run: rows are matched by slug (soft-deleted rows included) and never deleted or
 * overwritten; an existing row only gets its empty description / category / problemType filled.
 * Data: scripts/data/pseo-india-locations.js and scripts/data/pseo-india-catalog.js.
 * Inserts use bulkCreate, so they don't flood the audit log.
 */
require('dotenv').config({ quiet: true });
const db = require('../models');
const { STATES, HUBS } = require('./data/pseo-india-locations');
const { INDUSTRIES, TECHNOLOGIES, PROBLEMS } = require('./data/pseo-india-catalog');

const DRY = process.argv.includes('--dry-run');
db.sequelize.options.logging = false;

const slugify = (text) => String(text)
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/&/g, ' and ').replace(/[()']/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const report = {};
const note = (table, key) => { report[table] = report[table] || { created: 0, filled: 0, skipped: 0 }; report[table][key] += 1; };

/** Creates missing rows (by slug) and fills empty fields of existing ones. */
async function upsert(Model, table, rows, fillable) {
  const existing = await Model.findAll({ paranoid: false });
  const bySlug = new Map(existing.map((r) => [r.slug, r]));
  const toCreate = [];
  for (const row of rows) {
    const found = bySlug.get(row.slug);
    if (!found) {
      toCreate.push(row);
      bySlug.set(row.slug, row);
      note(table, 'created');
      continue;
    }
    const patch = {};
    fillable.forEach((f) => { if (row[f] && !found[f]) patch[f] = row[f]; });
    if (Object.keys(patch).length && found.update) {
      if (!DRY) await found.update(patch, { hooks: false });
      note(table, 'filled');
    } else {
      note(table, 'skipped');
    }
  }
  if (!DRY && toCreate.length) await Model.bulkCreate(toCreate, { hooks: false });
  return bySlug;
}

async function main() {
  const india = await db.Country.findOne({ where: { name: 'India' } });
  if (!india) throw new Error('Country "India" not found (Settings → Countries). Create it first.');

  // States / UTs
  const stateRows = STATES.map((s) => ({ name: s.name, slug: slugify(s.name), countryId: india.id, status: 'active' }));
  await upsert(db.State, 'states', stateRows, []);
  const states = new Map((await db.State.findAll({ paranoid: false })).map((s) => [s.slug, s]));

  // Locations (cities)
  const locationRows = [];
  const seen = new Set();
  for (const s of STATES) {
    const stateSlug = slugify(s.name);
    const state = states.get(stateSlug);
    for (const entry of s.cities) {
      const [name, customSlug] = Array.isArray(entry) ? entry : [entry];
      let slug = customSlug || slugify(name);
      if (seen.has(slug)) slug = `${slug}-${stateSlug}`;
      seen.add(slug);
      const hub = HUBS[name];
      locationRows.push({
        name,
        slug,
        stateId: state?.id || null, // null only in --dry-run before states exist
        countryId: india.id,
        description: hub
          ? `${name}, ${s.name}: ${hub}`
          : `${name}, ${s.name}: local traders, MSMEs, professionals and growing businesses that need GST, income tax, TDS, accounting and company compliance support.`,
        active: true,
      });
    }
  }
  await upsert(db.Location, 'Locations', locationRows, ['description', 'stateId']);

  await upsert(db.Industry, 'Industries', INDUSTRIES.map(([name, description]) => ({ name, slug: slugify(name), description, active: true })), ['description']);
  await upsert(db.Technology, 'Technologies', TECHNOLOGIES.map(([name, category, description]) => ({ name, slug: slugify(name), category, description, active: true })), ['description', 'category']);
  await upsert(db.Problem, 'Problems', PROBLEMS.map(([name, problemType, description]) => ({ name, slug: slugify(name), problemType, description, active: true })), ['description', 'problemType']);

  console.log(DRY ? 'DRY RUN (nothing written):' : 'Done:');
  console.table(report);
  for (const [M, label] of [[db.State, 'states'], [db.Location, 'locations'], [db.Industry, 'industries'], [db.Technology, 'technologies'], [db.Problem, 'problems']]) {
    console.log(`  ${label}: ${await M.count()} active rows in the database`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
