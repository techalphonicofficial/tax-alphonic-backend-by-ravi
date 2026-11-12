/*
 * pSEO hero background (2026-11-12): the admin's "Hero background" is stored as data-bg-* attributes
 * on the content's hero <section> (admin components/seo/pseoHeroBg.js, read by the website's
 * service/seoPageService.js). When AI writes the content again (SeoPageController generate /
 * bulk generate) those attributes are carried over to the new hero section, so the editor's
 * background is not lost.
 */
const BG_ATTR = /\sdata-bg-(image|overlay|opacity|text|position|size)\s*=\s*("[^"]*"|'[^']*')/gi;

/** The opening tag of the hero section: data-section="hero", else the first <section> (when it has the h1). */
function heroTag(html) {
  const source = String(html || '');
  const marked = source.match(/<section\b[^>]*\bdata-section\s*=\s*["']hero["'][^>]*>/i);
  if (marked) return { tag: marked[0], index: marked.index };
  const first = source.match(/<section\b[^>]*>/i);
  if (!first) return null;
  const rest = source.slice(first.index);
  const end = rest.search(/<\/section>/i);
  return /<h1\b/i.test(end < 0 ? rest : rest.slice(0, end)) ? { tag: first[0], index: first.index } : null;
}

/** `nextHtml` with the hero background attributes of `previousHtml` (unchanged when there are none). */
function keepHeroBackground(previousHtml, nextHtml) {
  const before = heroTag(previousHtml);
  if (!before) return nextHtml;
  const attrs = before.tag.match(BG_ATTR);
  if (!attrs || !attrs.length) return nextHtml;
  const after = heroTag(nextHtml);
  if (!after) return nextHtml;
  const cleaned = after.tag.replace(BG_ATTR, '');
  const tag = cleaned.replace(/\s*>$/, `${attrs.join('')}>`);
  return nextHtml.slice(0, after.index) + tag + nextHtml.slice(after.index + after.tag.length);
}

module.exports = { keepHeroBackground };
