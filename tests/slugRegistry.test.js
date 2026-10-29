// Slug registry: normalising and reserved website paths (no database needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSlug, reservedReason, conflictMessage, kindOfModel } = require('../services/slugRegistry');

test('normalizeSlug compares like the website', () => {
  assert.equal(normalizeSlug(' /India/XYZ-Registration/ '), 'india/xyz-registration');
  assert.equal(normalizeSlug(null), '');
});

test('website paths are reserved for services, pages and pSEO pages only', () => {
  for (const slug of ['about', 'blog', 'blog/x', 'lp', 'lp/cbdt', 'explore/tax', 'sitemap.xml', 'category/startup']) {
    assert.notEqual(reservedReason('service', slug), '', slug);
    assert.notEqual(reservedReason('seo_page', slug), '', slug);
  }
  assert.equal(reservedReason('service', 'gst-registration'), '');
  assert.equal(reservedReason('service', 'about-us'), '');
  assert.equal(reservedReason('page', 'journey/idea'), '');
  // Homepage page and landing page drafts are pages on purpose.
  assert.equal(reservedReason('page', 'home'), '');
  assert.equal(reservedReason('page', 'landing-page/cbdt'), '');
  assert.notEqual(reservedReason('service', 'home'), '');
  // Other namespaces have no reserved words.
  assert.equal(reservedReason('blog', 'about'), '');
  assert.equal(reservedReason('service_category', 'blog'), '');
});

test('conflictMessage names the record and mentions Trash', () => {
  const live = conflictMessage('xyz', { label: 'Page', name: 'XYZ', trashed: false });
  assert.match(live, /already used by the Page "XYZ"/);
  assert.match(conflictMessage('xyz', { label: 'Service', name: 'XYZ', trashed: true }), /Trash/);
});

test('kindOfModel maps models to kinds', () => {
  assert.equal(kindOfModel('Seopage'), 'seo_page');
  assert.equal(kindOfModel('Nope'), null);
});
