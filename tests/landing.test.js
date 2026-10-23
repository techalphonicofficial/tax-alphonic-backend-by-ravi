// Landing pages: subdomain rules and block validation (no database needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSubdomain, subdomainError, labelFromHost, landingUrl } = require('../services/landing/subdomain');
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
  assert.equal(landingUrl('cbdt', ['taxalphonic.com']), 'https://cbdt.taxalphonic.com/');
  assert.equal(landingUrl('cbdt', ['localhost']), 'http://cbdt.localhost:3000/');
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
