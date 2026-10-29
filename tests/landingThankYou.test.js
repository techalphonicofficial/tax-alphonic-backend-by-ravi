// Landing thank-you page settings: cleaning and limits (no database needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { clean, DEFAULTS, MAX_CODE } = require('../services/landing/thankYou');
const { subdomainError } = require('../services/landing/subdomain');

test('missing keys take the defaults', () => {
  const { settings, errors } = clean({});
  assert.deepEqual(errors, []);
  assert.equal(settings.enabled, true);
  assert.equal(settings.heading, DEFAULTS.heading);
  assert.equal(settings.steps.length, DEFAULTS.steps.length);
  assert.equal(settings.allHead, '');
});

test('steps are trimmed, emptied ones dropped, at most 6', () => {
  const steps = ['a', { text: ' b ' }, { text: '' }, 'c', 'd', 'e', 'f', 'g'];
  const { settings } = clean({ steps });
  assert.deepEqual(settings.steps.map((s) => s.text), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('tracking codes are kept as written, too long ones refused', () => {
  const code = '<script>fbq("track","Lead")</script>';
  assert.equal(clean({ thanksHead: ` ${code} ` }).settings.thanksHead, code);
  const { errors } = clean({ allHead: 'x'.repeat(MAX_CODE + 1) });
  assert.equal(errors[0].field, 'allHead');
});

test('an enabled page needs a heading; switches accept booleans', () => {
  assert.equal(clean({ enabled: true, heading: '  ' }).errors[0].field, 'heading');
  assert.equal(clean({ enabled: false, showCall: false }).settings.showCall, false);
});

test('thank-you is not a landing page URL name', () => {
  assert.ok(subdomainError('thank-you'));
  assert.ok(subdomainError('thanks'));
});
