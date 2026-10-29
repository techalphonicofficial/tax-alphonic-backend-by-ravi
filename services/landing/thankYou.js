// Thank-you page shared by every landing page, plus the ad tracking codes of landing pages
// (admin: Landing Pages → "Thank-you page & tracking"). After a landing form is submitted the
// website sends the visitor to <landing site>/lp/thank-you?from=<label>.
// Stored in `settings` (group "landing", key "thank_you", JSON). The public endpoint returns it
// as is: the tracking codes end up in the website's HTML anyway, so nothing here is secret
// (never put API keys / tokens in these codes).

const GROUP = 'landing';
const KEY = 'thank_you';
const MAX_CODE = 20000;
const MAX_STEPS = 6;
const CODE_KEYS = ['allHead', 'allBody', 'thanksHead', 'thanksBody'];

const DEFAULTS = Object.freeze({
  enabled: true,
  icon: '✅',
  heading: 'Thank you! We have received your details',
  message: 'Our expert will call you back shortly, usually within one working hour.',
  stepsTitle: 'What happens next',
  steps: [
    { text: 'An expert reviews your request' },
    { text: 'We call you to understand your case' },
    { text: 'You get a clear plan and a fixed quote' },
  ],
  backText: 'Back to the page',
  showCall: true,
  callText: 'Call us now',
  // Tracking codes (HTML: <script>, <noscript>, <img>). "all*" = every landing page and the
  // thank-you page (base tags: Google tag / GTM / Meta Pixel); "thanks*" = only the thank-you
  // page (conversion events). {{page}} becomes the landing page's URL name.
  allHead: '',
  allBody: '',
  thanksHead: '',
  thanksBody: '',
});

class ThankYouError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.status = 422;
    this.errors = errors;
  }
}

const text = (value, max, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim().slice(0, max);
};

/** The checked settings, or the problems found. Missing keys take the defaults. */
function clean(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const errors = [];
  const out = {
    enabled: input.enabled === undefined ? DEFAULTS.enabled : input.enabled === true || input.enabled === 'true',
    icon: text(input.icon, 16, DEFAULTS.icon),
    heading: text(input.heading, 160, DEFAULTS.heading),
    message: text(input.message, 1000, DEFAULTS.message),
    stepsTitle: text(input.stepsTitle, 80, DEFAULTS.stepsTitle),
    steps: (Array.isArray(input.steps) ? input.steps : DEFAULTS.steps)
      .map((step) => ({ text: text(typeof step === 'string' ? step : step?.text, 160) }))
      .filter((step) => step.text)
      .slice(0, MAX_STEPS),
    backText: text(input.backText, 60, DEFAULTS.backText),
    showCall: input.showCall === undefined ? DEFAULTS.showCall : input.showCall === true || input.showCall === 'true',
    callText: text(input.callText, 60, DEFAULTS.callText),
  };
  if (input.enabled !== undefined && !out.heading) errors.push({ field: 'heading', message: 'Give the thank-you page a heading' });
  CODE_KEYS.forEach((key) => {
    const value = input[key] === undefined || input[key] === null ? '' : String(input[key]);
    if (value.length > MAX_CODE) errors.push({ field: key, message: `Tracking code is too long (max ${MAX_CODE} characters)` });
    out[key] = value.trim();
  });
  return { settings: out, errors };
}

async function get() {
  const { Setting } = require('../../models');
  const row = await Setting.findOne({ where: { group: GROUP, key: KEY } });
  let saved = {};
  try { saved = JSON.parse(row?.value || '{}'); } catch { saved = {}; }
  return clean({ ...DEFAULTS, ...saved }).settings;
}

async function save(raw) {
  const { settings, errors } = clean(raw);
  if (errors.length) throw new ThankYouError(errors[0].message, errors);
  const { Setting } = require('../../models');
  const value = JSON.stringify(settings);
  const [row, created] = await Setting.findOrCreate({
    where: { group: GROUP, key: KEY },
    defaults: { group: GROUP, key: KEY, value, type: 'json', isPublic: false },
  });
  if (!created) await row.update({ value, type: 'json' });
  return settings;
}

module.exports = { get, save, clean, DEFAULTS, CODE_KEYS, MAX_CODE, ThankYouError };
