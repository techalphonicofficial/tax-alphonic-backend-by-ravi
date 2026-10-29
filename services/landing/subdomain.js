// Landing page addresses: <landing site>/lp/<label>, e.g. https://services.taxalphonic.com/lp/cbdt
// (until 2026-10-26 they were subdomains, cbdt.taxalphonic.com; the website now redirects those
// to the new address, which is why labelFromHost is kept; "services" is the landing host itself). The label keeps the old DNS-label rules:
// lowercase letters, digits and hyphens, 2-63 characters, no hyphen at either end.

// Hosts the company already uses or may need for infrastructure. Never a landing page.
const RESERVED = new Set([
  'www', 'admin', 'api', 'app', 'apps', 'backend', 'frontend', 'cms', 'cms-admin', 'dashboard',
  'mail', 'email', 'webmail', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'ftp', 'sftp', 'ssh', 'vpn',
  'ns', 'ns1', 'ns2', 'ns3', 'ns4', 'dns', 'cpanel', 'whm', 'webdisk', 'autodiscover', 'autoconfig',
  'cdn', 'static', 'assets', 'media', 'uploads', 'files', 'img', 'images',
  'dev', 'staging', 'stage', 'test', 'testing', 'qa', 'uat', 'demo', 'beta', 'sandbox', 'preview',
  'localhost', 'status', 'docs', 'help', 'support', 'blog', 'shop', 'store', 'pay', 'payments',
  'secure', 'login', 'auth', 'account', 'accounts', 'id', 'sso', 'portal', 'landing', 'lp', 'services',
  // /lp/thank-you is the thank-you page shown after every landing form.
  'thank-you', 'thankyou', 'thanks',
]);

const extraReserved = () => String(process.env.LANDING_RESERVED_SUBDOMAINS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;

/** "  GST Registration " → "gst-registration" (what the admin suggests as you type). */
function normalizeSubdomain(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '');
}

const isReserved = (label) => RESERVED.has(label) || extraReserved().includes(label);

/** '' when `label` can be used, else the reason (shown to the editor). */
function subdomainError(label) {
  const value = String(label ?? '');
  if (!value) return 'URL name is required';
  if (value.length < 2) return 'URL name must be at least 2 characters';
  if (value.length > 63) return 'URL name must be at most 63 characters';
  if (!LABEL.test(value)) return 'Use lowercase letters, digits and hyphens only, not starting or ending with a hyphen';
  if (value.slice(2, 4) === '--') return 'A hyphen pair in the 3rd-4th place is reserved for DNS (e.g. "xn--")';
  if (/^\d+$/.test(value)) return 'URL name cannot be only digits';
  if (isReserved(value)) return `"${value}" is reserved for the system`;
  return '';
}

/** Base domains landing pages live under (.env LANDING_BASE_DOMAINS, comma-separated). */
function baseDomains() {
  return String(process.env.LANDING_BASE_DOMAINS || 'taxalphonic.com')
    .split(',').map((d) => d.trim().toLowerCase().replace(/^\.+|\.+$/g, '')).filter(Boolean);
}

/**
 * The landing label of a hostname, or null: "cbdt.taxalphonic.com" → "cbdt". Only one label
 * directly under a configured base domain counts ("a.b.taxalphonic.com" does not), the port is
 * ignored, and reserved / invalid labels return null.
 */
function labelFromHost(host, domains = baseDomains()) {
  const name = String(host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!name || name.length > 253) return null;
  for (const domain of domains) {
    const suffix = `.${domain}`;
    if (!name.endsWith(suffix)) continue;
    const label = name.slice(0, -suffix.length);
    if (label.includes('.')) return null;
    return subdomainError(label) ? null : label;
  }
  return null;
}

/** Origin landing pages live on (.env LANDING_SITE_URL, default https://services.taxalphonic.com). */
function siteBase() {
  return String(process.env.LANDING_SITE_URL || 'https://services.taxalphonic.com').trim().replace(/[/]+$/, '');
}

/** Path of a landing page on the landing site: /lp/<label> */
const landingPath = (label) => `/lp/${label}`;

/** Public URL of a landing page: https://services.taxalphonic.com/lp/<label> */
function landingUrl(label, base = siteBase()) {
  return `${base}${landingPath(label)}`;
}

module.exports = { RESERVED, normalizeSubdomain, subdomainError, isReserved, baseDomains, labelFromHost, landingUrl, landingPath, siteBase };
