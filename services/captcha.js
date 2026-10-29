const crypto = require('crypto');

// Arithmetic captcha for every public website form (CMS form submit, blog comments, POST /inquiries).
// GET /captcha gives { question: "7 + 4", token }. The token is signed and stateless: it holds the
// question, a nonce and the expiry, and its signature covers the answer, so the answer itself is
// never in it. A submission sends `_captchaToken` + `_captcha` (the answer).
// A token works once: a wrong answer or a successful submission uses it up (in-memory list of used
// nonces, kept until they expire; one per process, which the expiry and the rate limits make enough).
// Secret: CAPTCHA_SECRET, falling back to JWT_SECRET.

const TTL_MS = 30 * 60 * 1000;   // time to fill in the form
const MIN_MS = 1500;             // faster than this is a script
const FIELD = '_captcha';

class CaptchaError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 422;
    this.errors = [{ field: FIELD, message }];
  }
}

const secret = () => {
  const value = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error('CAPTCHA_SECRET (or JWT_SECRET) must be set');
  return value;
};

const b64 = (value) => Buffer.from(value).toString('base64url');
const sign = (data, answer) => crypto.createHmac('sha256', secret()).update(`${data}.${answer}`).digest('base64url');
const rand = (min, max) => crypto.randomInt(min, max + 1);

/** A random sum, difference (never negative) or small product. */
function makeQuestion() {
  const kind = rand(0, 2);
  if (kind === 0) {
    const a = rand(1, 20), b = rand(1, 20);
    return { question: `${a} + ${b}`, answer: a + b };
  }
  if (kind === 1) {
    const a = rand(5, 25), b = rand(1, a - 1);
    return { question: `${a} − ${b}`, answer: a - b };
  }
  const a = rand(2, 9), b = rand(2, 9);
  return { question: `${a} × ${b}`, answer: a * b };
}

const used = new Map(); // nonce -> expiry time
function sweep(now) {
  for (const [nonce, exp] of used) if (exp <= now) used.delete(nonce);
}
/** Marks a nonce used; false when it already was. */
function useNonce(nonce, exp, now = Date.now()) {
  if (used.size > 5000) sweep(now);
  if (used.has(nonce)) return false;
  used.set(nonce, exp);
  return true;
}

/** → { question, token, expiresIn } */
function create(now = Date.now()) {
  const { question, answer } = makeQuestion();
  const data = b64(JSON.stringify({ q: question, n: crypto.randomBytes(12).toString('base64url'), i: now, e: now + TTL_MS }));
  return { question, token: `${data}.${sign(data, answer)}`, expiresIn: TTL_MS / 1000 };
}

function decode(token) {
  const [data, sig, extra] = String(token || '').split('.');
  if (!data || !sig || extra !== undefined || data.length > 400) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload && typeof payload.n === 'string' && Number.isFinite(payload.e) ? { data, sig, payload } : null;
  } catch {
    return null;
  }
}

/**
 * Checks `_captchaToken` / `_captcha` of a request body. Throws a CaptchaError (422, field
 * "_captcha") when missing, wrong, expired or already used. A wrong answer uses the token up.
 * `consume: false` only checks it (call `consume(body)` once the rest of the submission is valid,
 * so a typo in another field does not cost the visitor a new question).
 */
function verify(body = {}, { consume = true, now = Date.now() } = {}) {
  const token = body._captchaToken;
  const answer = String(body[FIELD] ?? '').trim().replace(/\s+/g, '');
  if (!token) throw new CaptchaError('Please answer the security question.');
  const parsed = decode(token);
  if (!parsed) throw new CaptchaError('The security question is not valid, please try the new one.');
  const { data, sig, payload } = parsed;
  if (payload.e <= now) throw new CaptchaError('The security question expired, please answer the new one.');
  if (used.has(payload.n)) throw new CaptchaError('Please answer the new security question.');
  if (!answer) throw new CaptchaError('Please answer the security question.');

  const expected = Buffer.from(sign(data, /^-?\d{1,4}$/.test(answer) ? Number(answer) : answer));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    useNonce(payload.n, payload.e, now);
    throw new CaptchaError('Wrong answer, please try the new question.');
  }
  if (now - Number(payload.i || 0) < MIN_MS) {
    useNonce(payload.n, payload.e, now);
    throw new CaptchaError('That was too quick, please answer the new question.');
  }
  if (consume && !useNonce(payload.n, payload.e, now)) throw new CaptchaError('Please answer the new security question.');
  return payload;
}

/** Uses up a token that verify(..., { consume: false }) accepted. */
function consume(body = {}, now = Date.now()) {
  const parsed = decode(body._captchaToken);
  if (!parsed || !useNonce(parsed.payload.n, parsed.payload.e, now)) throw new CaptchaError('Please answer the new security question.');
}

/** Drops the captcha keys from a body before it is stored. */
function strip(body = {}) {
  const { _captcha, _captchaToken, ...rest } = body;
  return rest;
}

module.exports = { create, verify, consume, strip, CaptchaError, FIELD, TTL_MS, MIN_MS, _used: used };
