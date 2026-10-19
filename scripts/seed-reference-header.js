/**
 * Seeds the website header and its services from the UI reference (uirefrence.html).
 *
 *   node scripts/seed-reference-header.js            # write
 *   node scripts/seed-reference-header.js --dry-run  # only print what would happen
 *
 * Data: scripts/data/reference-header.json (the reference's rendered header navigation, its SVC
 * service list and SVC_CONTENT texts). What it does:
 *  1. Service categories for the service menus (Startup, Registrations, ..., GeM Services).
 *  2. One service per service link, with Page Builder blocks built like the reference service
 *     page (hero, overview, benefits, documents, why us, process, sidebar form, FAQs). Services
 *     with written reference content are PUBLISHED; the rest are DRAFT (template text, shown on the
 *     website but kept out of the sitemap until reviewed and published in the admin).
 *     Existing slugs (services or CMS pages) are never touched; the menu just links to them.
 *  3. A header menu "Main Header" with every reference header item (icons, column headings,
 *     links). It becomes the active header menu; other header menus are set inactive (kept).
 * Safe to run again: existing categories/services are reused and the menu items are rebuilt.
 */
const db = require('../models');
const MenuService = require('../services/MenuService');
const data = require('./data/reference-header.json');

const DRY = process.argv.includes('--dry-run');
const MENU_NAME = 'Main Header';

// Header menus whose links are services (the others are Taxpedia, updates and notices).
const SERVICE_MENUS = ['Startup', 'Registrations', 'Trademark', 'GST', 'Income Tax', 'MCA', 'Compliance', 'Business Advisory', 'Lawyer Services', 'Global', 'Products', 'GeM Services'];
const CATEGORY_INFO = {
  'Business Advisory': { icon: '💼', desc: 'Senior-led advisory across regulatory, legal, tax, capital, technology & growth.' },
  'Lawyer Services': { icon: '⚖️', desc: 'Lawyers, legal drafting and dispute support.' },
  Products: { icon: '🧩', desc: 'Tax & compliance software, tools and calculators.' },
  'GeM Services': { icon: '🏛️', desc: 'Government e-Marketplace registration, catalogue, bidding and support.' },
};
const TOP_ICONS = { Taxpedia: '📚', 'GeM Services': '🏛️', 'Quick Update': '⚡', 'Government Notices': '📨', 'Business Advisory': '💼', 'Lawyer Services': '⚖️', Products: '🧩' };

const slugify = (value) => String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const EMOJI = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍|\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}])*)\s*/u;

/** "🧾 Compliance Services" → ["🧾", "Compliance Services"]; the generic 📁 is dropped. */
function splitIcon(text) {
  const value = String(text || '').trim();
  const match = value.match(EMOJI);
  if (!match) return ['', value];
  const icon = match[1] === '📁' ? '' : match[1];
  return [icon, value.slice(match[0].length).replace(/\s*→\s*$/, '').trim()];
}

/** Reference link target → website path. */
function pathOf(target) {
  const { fn, value = '' } = target || {};
  if (fn === 'go') return value.replace(/^#/, '') || '/';
  if (fn === 'goTp') return value || '/taxpedia';
  if (fn === 'goMt') return value || '#';
  return '';
}

const svcByLabel = new Map(Object.values(data.svc).map((s) => [s.label.toLowerCase(), s]));

/** Slug of the service a reference link opens, or '' when it isn't a service. */
function serviceSlugOf(link) {
  const { fn, value = '' } = link.target || {};
  if (fn === 'go' && value.startsWith('#/service/')) return value.slice('#/service/'.length);
  // "company--llp-registration-on-gem" → "company-llp-registration-on-gem"
  if (fn === 'goMt') return (value.split('/').filter(Boolean).pop() || '').replace(/-{2,}/g, '-');
  if (fn === 'go' || fn === 'goTp') return ''; // talk-to-expert, bcm, taxpedia ...
  const [, label] = splitIcon(link.label);
  return svcByLabel.get(label.toLowerCase())?.slug || slugify(label);
}

/* ---------- Page Builder blocks of a service (the reference service page) ---------- */

const DEFAULT_DOCS = ['PAN card — Of applicant / directors', 'Aadhaar card — For identity verification', 'Address proof — Recent utility bill / bank statement', 'Passport photo — Recent, of each applicant'];
const DEFAULT_FAQS = (label) => [
  [`How long does ${label} take?`, 'Most cases complete in 7–10 working days, depending on document readiness and government processing times.'],
  ['What does it cost?', 'Plans start at ₹1,999 plus applicable government fees, which we always show upfront — no hidden charges.'],
  ['Do I need to visit any office?', 'No. The entire process is 100% online. You upload documents and track progress from your dashboard.'],
  ['Who handles my application?', 'A qualified Chartered Accountant or Company Secretary manages your case end to end.'],
];

function processSteps(content) {
  const steps = content?.process?.length ? content.process.slice(0, 6) : [
    'Share your details — fill a short form and upload documents securely.',
    'Expert review — our CA/CS verifies everything and prepares your application.',
    'Government filing — we file with the relevant department and track it for you.',
    'Get your approval — receive your certificate / registration. Done!',
  ];
  const titles = ['Share your details', 'Expert review', 'Government filing', 'Verification', 'Processing', 'Get your approval'];
  const days = steps.length <= 4 ? ['Day 1', 'Day 2–3', 'Day 4–6', 'Day 7+'] : ['Day 1', 'Day 2', 'Day 3–4', 'Day 5–6', 'Day 7', 'Day 8+'];
  return steps.map((raw, index) => {
    const match = raw.match(/^(.*?)( — |: | – )(.*)$/);
    return {
      title: match ? match[1].trim() : titles[index] || `Step ${index + 1}`,
      description: match ? match[3].trim() : raw,
      duration: `⏱️ ${days[index] || `Day ${index + 1}`}`,
    };
  });
}

function buildSections(service, form) {
  const { label, icon, category, content } = service;
  const lower = label.toLowerCase();
  const sections = [];
  const add = (type, payload, config = {}) => sections.push({ type, config, payload });

  add('HeroBanner', {
    eyebrow: `${icon ? `${icon} ` : ''}${category}`,
    heading: `${label} made simple`,
    highlight: 'made simple',
    subHeading: `Get your ${lower} done by experts — fully online, transparent pricing, end-to-end support. No paperwork headaches, no hidden charges.`,
    price: '1999',
    primaryButton: { text: 'Get started', url: '#enquiry' },
    secondaryButton: { text: 'Talk to an expert', url: '/talk-to-expert' },
    stats: [{ value: '12,400+', label: 'businesses served' }, { value: '4.8/5', label: 'rating' }, { value: '100%', label: 'online' }],
    showMeta: false,
  });

  add('Overview', {
    title: `What is ${label}?`,
    content: content && (content.intro || content.whatIs)
      ? [content.intro, content.whatIs].filter(Boolean).map((text) => `<p>${escapeHtml(text)}</p>`).join('')
      : `<p>${escapeHtml(label)} is one of the most important steps for businesses operating in India. At Tax Alphonic, we handle the entire ${escapeHtml(lower)} process for you — from documentation to final approval — so you can focus on running your business while our experts manage the compliance.</p><p>Our team of qualified Chartered Accountants and Company Secretaries has completed thousands of filings. We keep you updated at every stage through your personal dashboard, so there are no surprises and no chasing for status.</p>`,
  }, { kicker: 'Overview', anchorId: 'overview' });

  if (content?.benefits?.length) {
    add('Checklist', { title: `Key benefits of ${label}`, items: content.benefits.map((text) => ({ text })) }, { placement: 'main', kicker: 'Why it matters', anchorId: 'benefits' });
  } else {
    add('ServicesIncluded', {
      title: `Key benefits of ${label}`,
      services: [
        { icon: '✅', title: 'Fully compliant', description: 'Done correctly the first time, as per the latest government rules.' },
        { icon: '⚡', title: 'Fast turnaround', description: "We move quickly so you're not waiting weeks for approvals." },
        { icon: '👨‍💼', title: 'Expert support', description: 'Real CA/CS professionals, not bots, handle your case.' },
        { icon: '💸', title: 'Transparent pricing', description: 'Government and professional fees shown upfront. No surprises.' },
      ],
    }, { kicker: 'Why it matters', anchorId: 'benefits' });
  }

  if (content?.who?.length) {
    add('Checklist', { title: `Who needs ${label}?`, items: content.who.map((text) => ({ text })) }, { placement: 'main', kicker: 'Who is this for', anchorId: 'eligibility' });
  }

  add('Checklist', {
    title: `Documents required for ${label}`,
    items: (content?.docs?.length ? content.docs : DEFAULT_DOCS).map((text) => ({ icon: '📄', text })),
  }, { placement: 'main', kicker: "What you'll need", anchorId: 'documents' });

  add('WhyUs', {
    title: `Why choose Tax Alphonic for ${label}`,
    reasons: [
      { icon: '👨‍💼', title: 'Real CA/CS experts', description: 'Qualified professionals handle your case — never bots or untrained staff.' },
      { icon: '💸', title: 'Transparent pricing', description: 'Government and professional fees shown upfront. No hidden charges, ever.' },
      { icon: '⚡', title: 'Fast & fully online', description: 'Track everything from your dashboard — no office visits, no chasing.' },
      { icon: '🛡️', title: '100% compliant', description: 'Done right the first time, as per the latest government rules.' },
      { icon: '🤝', title: 'End-to-end support', description: 'From documents to final certificate, we stay with you at every step.' },
      { icon: '⭐', title: '12,400+ businesses served', description: 'Trusted across India with a 4.8/5 average rating.' },
    ],
  }, { kicker: 'Why us', anchorId: 'whychoose' });

  add('OurProcess', {
    title: `How ${label} works — step by step`,
    steps: processSteps(content),
    button: { text: `Start ${label} now →`, url: '/talk-to-expert' },
  }, { kicker: 'How it works', anchorId: 'process' });

  if (form) {
    add('Form', {
      formId: form.id,
      formName: form.name,
      formSlug: form.slug,
      heading: 'Free consultation',
      subHeading: 'Talk to a CA/CS expert — no cost, no obligation.',
      note: '🔒 Your details are safe. We never spam.',
    }, { placement: 'sidebar', anchorId: 'enquiry' });
  }

  add('Checklist', {
    title: '✅ Why Tax Alphonic',
    items: [
      { icon: '👨‍💼', text: 'Real CA/CS experts' },
      { icon: '💸', text: 'Transparent, upfront pricing' },
      { icon: '⚡', text: '100% online — no office visits' },
      { icon: '🇮🇳', text: 'Available across all India' },
    ],
  }, { placement: 'sidebar' });

  add('Highlights', {
    title: '🔒 Safe & trusted',
    items: [
      { icon: '🛡️', title: 'Data encrypted' },
      { icon: '👨‍💼', title: 'CA/CS verified' },
      { icon: '💯', title: 'No hidden fees' },
      { icon: '🔁', title: 'Free revisions' },
    ],
  }, { placement: 'sidebar' });

  add('CallToAction', {
    variant: 'success',
    icon: '✅',
    title: '100% Satisfaction Promise',
    text: `We work until your ${lower} is done right. Dedicated expert, clear updates, on-time delivery.`,
  }, { placement: 'sidebar' });

  add('CallToAction', {
    variant: 'dark',
    title: `Ready to start ${label}?`,
    text: 'Talk to an expert for free — no cost, no obligation.',
    buttons: [{ text: '🎧 Get started free', url: '/talk-to-expert' }],
  }, { placement: 'sidebar' });

  add('Faq', {
    title: 'FAQs',
    faqs: (content?.faqs?.length ? content.faqs : DEFAULT_FAQS(label)).map(([question, answer]) => ({ question, answer })),
  }, { kicker: 'Questions', anchorId: 'faqs' });

  return sections;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function schemaOf(service, description) {
  const faqs = service.content?.faqs?.length ? service.content.faqs : DEFAULT_FAQS(service.label);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: service.label, description, serviceType: service.category, provider: { '@type': 'Organization', name: 'Tax Alphonic' }, areaServed: 'IN' },
      { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  });
}

/* ---------- Collect services and the menu tree from the reference ---------- */

function collect() {
  const services = new Map(); // slug -> { label, icon, category, content }
  const menuOrder = [...data.topbar.map((m) => ({ ...m, top: true })), ...data.mega];

  const menu = menuOrder.map((m) => {
    const [labelIcon, label] = splitIcon(m.label);
    const isService = SERVICE_MENUS.includes(label);
    const category = label;
    const linkItem = (link, columnIcon) => {
      const [ownIcon, title] = splitIcon(link.label);
      const icon = link.icon || ownIcon || '';
      if (isService) {
        const slug = serviceSlugOf(link);
        if (slug) {
          const known = data.svc[slug];
          if (!services.has(slug)) {
            services.set(slug, {
              slug,
              label: known?.label || title,
              icon: icon || known?.icon || columnIcon || data.catMeta[category]?.icon || CATEGORY_INFO[category]?.icon || '',
              category,
              content: data.content[slug] || null,
            });
          }
          return { title, url: `/${slug}`, icon: icon || known?.icon || '' };
        }
      }
      return { title, url: pathOf(link.target) || '#', icon: icon || '' };
    };

    let children;
    if (m.columns) {
      children = m.columns.map((column) => {
        const [colIcon, colTitle] = splitIcon(column.title);
        return {
          title: colTitle || 'More',
          url: '#',
          icon: colIcon,
          children: column.links.map((link) => linkItem(link, colIcon)),
        };
      });
    } else {
      children = (m.links || []).map((link) => linkItem(link, ''));
    }

    return {
      title: label,
      url: m.top && label === 'Government Notices' ? '/notices' : m.top && label === 'Taxpedia' ? '/taxpedia' : '#',
      icon: labelIcon || TOP_ICONS[label] || data.catMeta[label]?.icon || '',
      children,
    };
  });

  // Loan Bazar is the fifth top-bar item (the website puts the first five menu items in the top bar).
  if (data.loanBazar) menu.splice(data.topbar.length, 0, { title: data.loanBazar.label, url: '/loan-bazar', icon: data.loanBazar.icon, children: [] });
  return { services, menu };
}

/* ---------- Write ---------- */

async function main() {
  const { Service, ServiceCategory, ServiceSection, ServiceSectionData, SectionType, Page, Menu, Form } = db;
  const { services, menu } = collect();

  const existingServices = new Set((await Service.findAll({ attributes: ['slug'], paranoid: false })).map((s) => String(s.slug).toLowerCase()));
  const pageSlugs = new Set((await Page.findAll({ attributes: ['slug'], paranoid: false })).map((p) => String(p.slug).toLowerCase()));
  const toCreate = [...services.values()].filter((s) => !existingServices.has(s.slug) && !pageSlugs.has(s.slug));
  const reused = services.size - toCreate.length;
  const countItems = (items) => items.reduce((n, item) => n + 1 + countItems(item.children || []), 0);

  console.log(`Services in the reference header: ${services.size} (new: ${toCreate.length}, already exist: ${reused})`);
  console.log(`  published (written content): ${toCreate.filter((s) => s.content).length}, draft (template text): ${toCreate.filter((s) => !s.content).length}`);
  console.log(`Header menu "${MENU_NAME}": ${menu.length} top items, ${countItems(menu)} items in all`);
  if (DRY) {
    console.log('Dry run: nothing written.');
    return;
  }

  // 1. Categories
  const categories = {};
  for (const name of SERVICE_MENUS) {
    const slug = slugify(name);
    let category = await ServiceCategory.findOne({ where: { slug }, paranoid: false });
    if (!category) {
      category = await ServiceCategory.create({ name, slug, description: data.catMeta[name]?.desc || CATEGORY_INFO[name]?.desc || null, status: 'published' });
    }
    categories[name] = category.id;
  }

  // 2. Services with their blocks
  const form = await Form.findOne({ where: { slug: 'contact-us', status: 'active' } }) || await Form.findOne({ where: { status: 'active' } });
  const typeIds = {};
  const typeId = async (key, transaction) => {
    if (typeIds[key]) return typeIds[key];
    const [type] = await SectionType.findOrCreate({ where: { componentKey: key }, defaults: { name: key, componentKey: key, category: 'Content', isActive: true }, transaction });
    typeIds[key] = type.id;
    return type.id;
  };

  let created = 0;
  for (const item of toCreate) {
    const transaction = await db.sequelize.transaction();
    try {
      const lede = `Get your ${item.label.toLowerCase()} done by experts — fully online, transparent pricing, end-to-end support.`;
      const description = item.content?.meta || `${item.label} made simple with Tax Alphonic. Expert help with documents, process, fees and timeline.`;
      const service = await Service.create({
        title: item.label,
        slug: item.slug,
        icon: item.icon || null,
        summary: lede,
        categoryId: categories[item.category] || null,
        metaTitle: `${item.label} — Tax Alphonic`,
        metaDescription: description,
        robots: 'index, follow',
        schemaMarkup: schemaOf(item, description),
        status: item.content ? 'published' : 'draft',
      }, { transaction });

      const blocks = buildSections(item, form);
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        const section = await ServiceSection.create({
          serviceId: service.id,
          sectionTypeId: await typeId(block.type, transaction),
          sortOrder: index,
          config: block.config,
        }, { transaction });
        await ServiceSectionData.create({ serviceSectionId: section.id, payload: block.payload }, { transaction });
      }
      await transaction.commit();
      created += 1;
      if (created % 50 === 0) console.log(`  ${created}/${toCreate.length} services created`);
    } catch (error) {
      await transaction.rollback();
      console.error(`  ✗ ${item.slug}: ${error.message}`);
    }
  }
  console.log(`Created ${created} services.`);

  // 3. Header menu (rebuilt each run), made the active header
  let headerMenu = await Menu.findOne({ where: { name: MENU_NAME, location: 'header' } });
  if (!headerMenu) headerMenu = await Menu.create({ name: MENU_NAME, location: 'header', status: 'active' });
  await MenuService.updateMenuWithItems(headerMenu.id, { status: 'active', items: menu });
  const [deactivated] = await Menu.update({ status: 'inactive' }, { where: { location: 'header', status: 'active', id: { [db.Sequelize.Op.ne]: headerMenu.id } } });
  console.log(`Header menu "${MENU_NAME}" saved and active (${deactivated} other header menu(s) set inactive).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
