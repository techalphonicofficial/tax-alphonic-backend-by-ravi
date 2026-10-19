// Helpers that turn raw model changes into readable audit log entries.

// Model name -> module name shown in the admin Audit Logs page
const MODULE_LABELS = {
  AboutPage: 'About Page',
  Banner: 'Banners',
  Blog: 'Blogs', BlogComment: 'Blogs',
  BlogAuthor: 'Blog Authors',
  BlogCategory: 'Blog Categories',
  BlogTag: 'Blog Tags',
  Branch: 'Branches',
  Country: 'Countries',
  Faq: 'FAQs',
  Form: 'Forms',
  Industry: 'Industries',
  Inquiry: 'Inquiries',
  Location: 'Locations',
  Media: 'Media',
  MediaCategory: 'Media Categories',
  MediaFolder: 'Media Folders',
  Menu: 'Menus',
  Package: 'Packages',
  Page: 'Pages',
  PageCategory: 'Page Categories',
  Partner: 'Partners',
  Permission: 'Permissions',
  PortfolioCategory: 'Portfolio Categories',
  PortfolioItem: 'Portfolio Items',
  Problem: 'Problems',
  Role: 'Roles',
  Seo: 'SEO',
  Seopage: 'SEO Pages',
  AiSetting: 'AI Settings',
  Service: 'Services',
  ServiceCategory: 'Service Categories',
  Setting: 'Settings',
  State: 'States',
  TeamMember: 'Team Members',
  Technology: 'Technologies',
  Testimonial: 'Testimonials',
  User: 'Users',
};

// Singular noun used in descriptions ("Updated page ...")
const RECORD_NOUNS = {
  AboutPage: 'about page', Banner: 'banner', Blog: 'blog', BlogComment: 'blog comment', BlogAuthor: 'blog author',
  BlogCategory: 'blog category', BlogTag: 'blog tag', Branch: 'branch', Country: 'country',
  Faq: 'FAQ', Form: 'form', Industry: 'industry', Inquiry: 'inquiry', Location: 'location',
  Media: 'media file', MediaCategory: 'media category', MediaFolder: 'media folder', Menu: 'menu',
  Package: 'package', Page: 'page', PageCategory: 'page category', Partner: 'partner',
  Permission: 'permission', PortfolioCategory: 'portfolio category', PortfolioItem: 'portfolio item',
  Problem: 'problem', Role: 'role', Seo: 'SEO config', Seopage: 'SEO page', Service: 'service',
  ServiceCategory: 'service category', Setting: 'setting', State: 'state', TeamMember: 'team member',
  Technology: 'technology', Testimonial: 'testimonial', User: 'user',
};

const SENSITIVE_KEY = /pass(word)?|secret|token|api[_-]?key|private[_-]?key/i;
const REDACTED = '[REDACTED]';

const moduleLabel = (modelName) => MODULE_LABELS[modelName] || modelName;
const recordNoun = (modelName) => RECORD_NOUNS[modelName] || modelName;

const redact = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = SENSITIVE_KEY.test(key) && value !== null && value !== undefined && value !== '' ? REDACTED : value;
  }
  return out;
};

// Human label for a record: "GST Registration", "Ravi Sharma (ravi@x.com)", ...
const recordLabel = (data = {}) => {
  if (data.firstName || data.lastName) {
    return `${[data.firstName, data.lastName].filter(Boolean).join(' ')}${data.email ? ` (${data.email})` : ''}`;
  }
  const label = data.title || data.name || data.question || data.authorName || data.heroTitle ||
    data.originalName || data.filename || data.email || data.slug || data.key;
  if (!label) return '';
  const text = String(label);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return value;
  }
};

// ---------------------------------------------------------------------------
// Page Builder sections: describe what changed between two section arrays
// ---------------------------------------------------------------------------

const BLOCK_LABELS = {
  HeroBanner: 'Hero Banner',
  Overview: 'Overview',
  WhyUs: 'Why Us',
  Faq: 'FAQ',
  ServicesIncluded: 'Services Included',
  OurProcess: 'Our Process',
  Form: 'Form',
};

const blockType = (section) => (typeof section?.type === 'object' ? section.type?.componentKey : section?.type) || 'Unknown';
const blockLabel = (type) => BLOCK_LABELS[type] || type;

const formRefs = (sections) => sections
  .filter(s => blockType(s) === 'Form')
  .map(s => {
    const payload = parseMaybeJson(s.data?.payload) || {};
    return { id: payload.formId || '', name: payload.formName || payload.formSlug || payload.formId || 'unnamed form' };
  })
  .filter(f => f.id);

const countByType = (sections) => sections.reduce((acc, s) => {
  const type = blockType(s);
  if (type !== 'Form') acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {});

// Works without stable block ids (service sections are recreated on every save)
const describeSectionChanges = (oldValue, newValue) => {
  const oldSections = Array.isArray(parseMaybeJson(oldValue)) ? parseMaybeJson(oldValue) : [];
  const newSections = Array.isArray(parseMaybeJson(newValue)) ? parseMaybeJson(newValue) : [];
  const changes = [];

  // Forms attached / removed / swapped
  const oldForms = formRefs(oldSections);
  const newForms = formRefs(newSections);
  newForms.filter(f => !oldForms.some(o => o.id === f.id))
    .forEach(f => changes.push(`attached form "${f.name}"`));
  oldForms.filter(o => !newForms.some(f => f.id === o.id))
    .forEach(o => changes.push(`removed form "${o.name}"`));
  const emptyFormBlocksDelta = newSections.filter(s => blockType(s) === 'Form').length - newForms.length
    - (oldSections.filter(s => blockType(s) === 'Form').length - oldForms.length);
  if (emptyFormBlocksDelta > 0) changes.push(`added ${emptyFormBlocksDelta} empty Form block(s)`);
  if (emptyFormBlocksDelta < 0) changes.push(`removed ${-emptyFormBlocksDelta} empty Form block(s)`);

  // Other blocks added / removed
  const oldCounts = countByType(oldSections);
  const newCounts = countByType(newSections);
  new Set([...Object.keys(oldCounts), ...Object.keys(newCounts)]).forEach(type => {
    const diff = (newCounts[type] || 0) - (oldCounts[type] || 0);
    if (diff > 0) changes.push(`added ${diff > 1 ? `${diff} ` : ''}${blockLabel(type)} block${diff > 1 ? 's' : ''}`);
    if (diff < 0) changes.push(`removed ${-diff > 1 ? `${-diff} ` : ''}${blockLabel(type)} block${-diff > 1 ? 's' : ''}`);
  });

  if (changes.length === 0) {
    const signature = (list) => JSON.stringify(list.map(s => ({ t: blockType(s), p: parseMaybeJson(s.data?.payload) || {} })));
    const typesOrder = (list) => list.map(blockType).join(',');
    if (typesOrder(oldSections) !== typesOrder(newSections)) changes.push('reordered blocks');
    else if (signature(oldSections) !== signature(newSections)) changes.push('edited block content');
  }

  return changes;
};

// Compact block list for audit snapshots: [{ type, formId?, formName? }]
const summarizeSections = (value) => {
  const sections = Array.isArray(parseMaybeJson(value)) ? parseMaybeJson(value) : [];
  return sections.map(s => {
    const type = blockType(s);
    if (type !== 'Form') return { type };
    const payload = parseMaybeJson(s.data?.payload) || {};
    return { type, formId: payload.formId || null, formName: payload.formName || null };
  });
};

// Section-holding columns per model (Blog keeps its sections JSON in content)
const SECTION_FIELDS = { Page: ['sections'], Blog: ['content'] };

// "title, status, sections (attached form "GST Enquiry")"
const describeChangedFields = (modelName, changedFields, oldData, newData) => changedFields.map(field => {
  if ((SECTION_FIELDS[modelName] || []).includes(field)) {
    const sectionChanges = describeSectionChanges(oldData[field], newData[field]);
    const isBuilder = Array.isArray(parseMaybeJson(newData[field])) || Array.isArray(parseMaybeJson(oldData[field]));
    if (isBuilder && sectionChanges.length > 0) return `page builder (${sectionChanges.join(', ')})`;
  }
  if (field === 'status' && oldData.status !== undefined) return `status ${oldData.status} → ${newData.status}`;
  return field;
}).join(', ');

module.exports = {
  REDACTED,
  moduleLabel,
  recordNoun,
  recordLabel,
  redact,
  parseMaybeJson,
  describeSectionChanges,
  describeChangedFields,
  summarizeSections,
};
