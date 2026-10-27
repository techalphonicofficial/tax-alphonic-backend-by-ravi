// Landing pages: subdomain rules and block validation (no database needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSubdomain, subdomainError, labelFromHost, landingUrl, landingPath } = require('../services/landing/subdomain');
const { validateSections, referencesOf, normalizeSections } = require('../services/landing/landingValidation');

test('normalizeSubdomain makes a DNS label', () => {
  assert.equal(normalizeSubdomain('  GST Registration '), 'gst-registration');
  assert.equal(normalizeSubdomain('ITR__Filing!!'), 'itr-filing');
  assert.equal(normalizeSubdomain('Café Tax'), 'cafe-tax');
  assert.equal(normalizeSubdomain('---'), '');
  assert.equal(normalizeSubdomain('a'.repeat(80)).length, 63);
});

test('subdomainError accepts service labels and rejects bad or reserved ones', () => {
  for (const ok of ['cbdt', 'gst', 'itr-filing', 'tds2', 'income-tax']) assert.equal(subdomainError(ok), '', ok);
  for (const bad of ['', 'a', '-gst', 'gst-', 'GST', 'g_st', 'gst.tax', 'xn--abc', '12345', 'a'.repeat(64)]) {
    assert.notEqual(subdomainError(bad), '', bad);
  }
  for (const reserved of ['www', 'admin', 'api', 'frontend', 'mail', 'cpanel', 'staging']) {
    assert.match(subdomainError(reserved), /reserved/, reserved);
  }
});

test('LANDING_RESERVED_SUBDOMAINS adds reserved labels', () => {
  process.env.LANDING_RESERVED_SUBDOMAINS = 'partners, crm';
  try {
    assert.match(subdomainError('crm'), /reserved/);
    assert.equal(subdomainError('cbdt'), '');
  } finally {
    delete process.env.LANDING_RESERVED_SUBDOMAINS;
  }
});

test('labelFromHost only trusts one label under a configured base domain', () => {
  const domains = ['taxalphonic.com', 'localhost'];
  assert.equal(labelFromHost('cbdt.taxalphonic.com', domains), 'cbdt');
  assert.equal(labelFromHost('GST.TaxAlphonic.com:443', domains), 'gst');
  assert.equal(labelFromHost('cbdt.taxalphonic.com.', domains), 'cbdt');
  assert.equal(labelFromHost('cbdt.localhost:3000', domains), 'cbdt');
  assert.equal(labelFromHost('taxalphonic.com', domains), null);
  assert.equal(labelFromHost('www.taxalphonic.com', domains), null);
  assert.equal(labelFromHost('frontend.taxalphonic.com', domains), null);
  assert.equal(labelFromHost('a.b.taxalphonic.com', domains), null);
  assert.equal(labelFromHost('cbdt.taxalphonic.com.evil.com', domains), null);
  assert.equal(labelFromHost('cbdt.eviltaxalphonic.com', domains), null);
  assert.equal(labelFromHost('cbdt.example.com', domains), null);
  assert.equal(labelFromHost('', domains), null);
});

test('landingUrl builds the public address', () => {
  assert.equal(landingUrl('cbdt', 'https://taxalphonic.com'), 'https://taxalphonic.com/lp/cbdt');
  assert.equal(landingUrl('gst', 'http://localhost:3000'), 'http://localhost:3000/lp/gst');
  assert.equal(landingPath('cbdt'), '/lp/cbdt');
  assert.equal(landingUrl('cbdt'), process.env.LANDING_SITE_URL ? landingUrl('cbdt') : 'https://services.taxalphonic.com/lp/cbdt');
  assert.equal(subdomainError('services'), '"services" is reserved for the system');
});

const block = (id, type, payload = {}, config = {}) => ({ id, type, config, data: { payload } });

test('validateSections: a normal landing page passes, publish needs a body block', () => {
  const page = [
    block('h', 'LandingHeader', { mode: 'simple' }),
    block('b1', 'HeroBanner', { heading: 'CBDT' }),
    block('b2', 'Form', { formId: 'f1' }, { placement: 'sidebar' }),
    block('f', 'LandingFooter', { mode: 'site' }),
  ];
  assert.deepEqual(validateSections(page, { strict: true }), []);
  const onlyChrome = [block('h', 'LandingHeader'), block('f', 'LandingFooter')];
  assert.equal(validateSections(onlyChrome).length, 0, 'a draft may be empty');
  assert.ok(validateSections(onlyChrome, { strict: true }).some((e) => /at least one content block/.test(e.message)));
});

test('validateSections rejects duplicates, bad types, script links and empty form blocks', () => {
  const errors = validateSections([
    block('h1', 'LandingHeader'), block('h2', 'LandingHeader'),
    block('x', 'HeroBanner'), block('x', 'Overview'),
    block('bad', 'not a type'),
    block('cta', 'CommonButtons', { buttons: [{ text: 'Go', url: 'javascript:alert(1)' }] }),
    block('bg', 'Overview', {}, { background: { image: ' JavaScript:alert(1)' } }),
    block('mode', 'LandingFooter', { mode: 'fancy' }),
    block('form', 'Form', {}),
  ], { strict: true });
  const text = errors.map((e) => `${e.field}: ${e.message}`).join('\n');
  assert.match(text, /only one Header/);
  assert.match(text, /share the id "x"/);
  assert.match(text, /Unknown block type/);
  assert.match(text, /buttons\[0\]\.url/);
  assert.match(text, /config\.background\.image/);
  assert.match(text, /Footer style/);
  assert.match(text, /no form selected/);
  assert.equal(validateSections('nope')[0].message, 'Sections must be an array');
});

test('referencesOf and normalizeSections', () => {
  const raw = [
    { id: 1, type: { componentKey: 'Form' }, config: '{"placement":"sidebar"}', data: { payload: '{"formId":"f1"}' } },
    { id: 'p', type: 'Packages', payload: { packageIds: ['a', 'b', 'a'] } },
  ];
  assert.deepEqual(referencesOf(raw), { formIds: ['f1'], packageIds: ['a', 'b'] });
  assert.deepEqual(normalizeSections(raw), [
    { id: '1', type: 'Form', config: { placement: 'sidebar' }, data: { payload: { formId: 'f1' } } },
    { id: 'p', type: 'Packages', config: {}, data: { payload: { packageIds: ['a', 'b', 'a'] } } },
  ]);
});

test('form popup buttons: referenced forms and the page form', () => {
  const { popupForms } = require('../services/landing/landingValidation');
  assert.deepEqual(popupForms({ button: { text: 'Enquire', url: '#form' }, steps: [{ url: '#form-abc_1' }], other: '#formx' }), ['', 'abc_1']);

  const header = { id: 'h', type: 'LandingHeader', data: { payload: { mode: 'simple', button: { text: 'Enquire Now', url: '#form' } } } };
  const hero = { id: 'x', type: 'HeroBanner', data: { payload: { primaryButton: { text: 'Call me', url: '#form-f9' } } } };
  const form = { id: 'f', type: 'Form', data: { payload: { formId: 'f1' } } };

  // "#form" needs a Form block with a form before publishing; drafts may save without one.
  assert.match(validateSections([header, hero], { strict: true }).map((e) => e.message).join(' '), /no Form block/);
  assert.equal(validateSections([header, hero]).length, 0);
  assert.equal(validateSections([header, hero, form], { strict: true }).length, 0);

  // Popup forms are checked like Form blocks' forms on publish.
  assert.deepEqual(referencesOf([header, hero, form]).formIds.sort(), ['f1', 'f9']);
});

test('custom theme colours are checked (they become CSS)', () => {
  const header = (payload) => ({ id: 'h', type: 'LandingHeader', data: { payload: { mode: 'simple', ...payload } } });
  const body = { id: 'b', type: 'Overview', data: { payload: {} } };
  assert.equal(validateSections([header({ pageTheme: 'custom', customTheme: { name: 'Mine', brand: '#1A73E8', accent: '#f59e0b', deep: '#0b1120' } }), body]).length, 0);
  const bad = validateSections([header({ pageTheme: 'custom', customTheme: { brand: 'red;background:url(x)', accent: '#fff', deep: '#0b1120' } }), body]);
  assert.deepEqual(bad.map((e) => e.field), ['sections[0].payload.customTheme.brand', 'sections[0].payload.customTheme.accent']);
  assert.equal(validateSections([header({ pageTheme: 'custom' }), body]).length, 3);
  assert.equal(validateSections([header({ pageTheme: 'ocean' }), body]).length, 0);

  const { cleanTheme } = require('../services/landing/customThemes');
  assert.deepEqual(cleanTheme({ name: ' Brand ', brand: '#ABCDEF', accent: '#000000', deep: '#111111' }), { theme: { name: 'Brand', brand: '#abcdef', accent: '#000000', deep: '#111111' }, errors: [] });
  assert.equal(cleanTheme({ brand: '#abc' }).errors.length, 4);
});
