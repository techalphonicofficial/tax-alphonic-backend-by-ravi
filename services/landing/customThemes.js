// Custom colour themes of landing pages ("My themes" in the admin), shared by every landing page.
// A page that uses one keeps its own copy of the colours (Header block payload.customTheme), so
// editing or deleting a theme here never changes a page until the theme is picked again.
// Stored in `settings` (group "landing", key "custom_themes", JSON).

const GROUP = 'landing';
const KEY = 'custom_themes';
const MAX_THEMES = 40;
const HEX = /^#[0-9a-f]{6}$/i;
const COLOURS = ['brand', 'accent', 'deep'];

class ThemeError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.status = 422;
    this.errors = errors;
  }
}

/** { name, brand, accent, deep } with checked values, or the problems found. */
function cleanTheme(raw, at = 'theme') {
  const errors = [];
  const theme = raw && typeof raw === 'object' ? raw : {};
  const name = String(theme.name ?? '').trim().slice(0, 40);
  if (!name) errors.push({ field: `${at}.name`, message: 'Give the theme a name' });
  const out = { name };
  COLOURS.forEach((c) => {
    const value = String(theme[c] ?? '').trim().toLowerCase();
    if (!HEX.test(value)) errors.push({ field: `${at}.${c}`, message: `${c} must be a colour like #1a73e8` });
    out[c] = value;
  });
  return { theme: out, errors };
}

async function list() {
  const { Setting } = require('../../models');
  const row = await Setting.findOne({ where: { group: GROUP, key: KEY } });
  let themes = [];
  try { themes = JSON.parse(row?.value || '[]'); } catch { themes = []; }
  return (Array.isArray(themes) ? themes : []).filter((t) => t && t.id && HEX.test(t.brand) && HEX.test(t.accent) && HEX.test(t.deep));
}

/** Replaces the whole list (the admin sends it after an add / edit / delete). */
async function save(rawThemes) {
  if (!Array.isArray(rawThemes)) throw new ThemeError('themes must be a list');
  if (rawThemes.length > MAX_THEMES) throw new ThemeError(`At most ${MAX_THEMES} custom themes`);
  const errors = [];
  const ids = new Set();
  const themes = rawThemes.map((raw, i) => {
    const { theme, errors: problems } = cleanTheme(raw, `themes[${i}]`);
    errors.push(...problems);
    let id = String(raw?.id || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    if (!id || ids.has(id)) id = `t${Date.now().toString(36)}${i}`;
    ids.add(id);
    return { id, ...theme };
  });
  if (errors.length) throw new ThemeError(errors[0].message, errors);

  const { Setting } = require('../../models');
  const value = JSON.stringify(themes);
  const [row, created] = await Setting.findOrCreate({
    where: { group: GROUP, key: KEY },
    defaults: { group: GROUP, key: KEY, value, type: 'json', isPublic: false },
  });
  if (!created) await row.update({ value, type: 'json' });
  return themes;
}

module.exports = { list, save, cleanTheme, ThemeError, HEX, COLOURS };
