// Clone helpers for services and pages (no database needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { copyTitle, copySlugCandidates, copyFields } = require('../services/cloneRecord');

test('the copy title gets "(Copy)" and stays within 255 characters', () => {
  assert.equal(copyTitle('GST Registration'), 'GST Registration (Copy)');
  assert.equal(copyTitle('x'.repeat(300)).length, 255);
  assert.ok(copyTitle('x'.repeat(300)).endsWith(' (Copy)'));
});

test('copy slugs are "-copy", then "-copy-2"…; copying a copy does not stack "-copy"', () => {
  assert.deepEqual(copySlugCandidates('gst-registration', 3), ['gst-registration-copy', 'gst-registration-copy-2', 'gst-registration-copy-3']);
  assert.equal(copySlugCandidates('gst-registration-copy-2', 1)[0], 'gst-registration-copy');
  assert.equal(copySlugCandidates('journey/idea', 1)[0], 'journey/idea-copy');
});

test('ids, slug, status, dates, canonical URL and the extra keys are not copied', () => {
  const out = copyFields({ id: 1, slug: 's', title: 't', status: 'published', createdAt: 1, updatedAt: 1, deletedAt: null, publishDate: 1, canonicalUrl: 'https://x', content: 'c', metaTitle: 'm', sections: [] }, ['sections']);
  assert.deepEqual(out, { content: 'c', metaTitle: 'm' });
});
