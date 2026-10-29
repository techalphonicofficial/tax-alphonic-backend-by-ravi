// Arithmetic captcha for public forms (no database needed). Run: npm test
process.env.CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const Captcha = require('../services/captcha');

const solve = (question) => {
  const [a, op, b] = question.split(' ');
  return op === '+' ? +a + +b : op === '×' ? a * b : a - b;
};
const later = (ms = Captcha.MIN_MS + 10) => Date.now() + ms;
const field = (fn) => {
  try { fn(); } catch (error) { return error instanceof Captcha.CaptchaError ? error.errors[0].field : error; }
  return null;
};

test('the token does not contain the answer and the right answer passes once', () => {
  const { question, token } = Captcha.create();
  const answer = solve(question);
  assert.ok(!Buffer.from(token.split('.')[0], 'base64url').toString().includes(`"${answer}"`));
  const body = { _captchaToken: token, _captcha: ` ${answer} ` };
  assert.ok(Captcha.verify(body, { now: later() }));
  assert.equal(field(() => Captcha.verify(body, { now: later() })), '_captcha'); // used up
});

test('missing, wrong, tampered, too quick and expired are refused', () => {
  assert.equal(field(() => Captcha.verify({})), '_captcha');
  const a = Captcha.create();
  assert.equal(field(() => Captcha.verify({ _captchaToken: a.token, _captcha: solve(a.question) + 1 }, { now: later() })), '_captcha');
  // a wrong answer uses the token up: the right one no longer works
  assert.equal(field(() => Captcha.verify({ _captchaToken: a.token, _captcha: solve(a.question) }, { now: later() })), '_captcha');

  const b = Captcha.create();
  const [data, sig] = b.token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, 'base64url')), e: Date.now() * 2 })).toString('base64url');
  assert.equal(field(() => Captcha.verify({ _captchaToken: `${forged}.${sig}`, _captcha: solve(b.question) }, { now: later() })), '_captcha');

  const c = Captcha.create();
  assert.equal(field(() => Captcha.verify({ _captchaToken: c.token, _captcha: solve(c.question) }, { now: Date.now() })), '_captcha');

  const d = Captcha.create();
  assert.equal(field(() => Captcha.verify({ _captchaToken: d.token, _captcha: solve(d.question) }, { now: later(Captcha.TTL_MS + 1) })), '_captcha');
});

test('consume: false checks only; consume() then uses it up', () => {
  const { question, token } = Captcha.create();
  const body = { _captchaToken: token, _captcha: String(solve(question)) };
  Captcha.verify(body, { consume: false, now: later() });
  Captcha.verify(body, { consume: false, now: later() }); // a field error elsewhere: still valid
  Captcha.consume(body);
  assert.equal(field(() => Captcha.consume(body)), '_captcha');
});

test('questions never go negative and strip() drops the captcha keys', () => {
  for (let i = 0; i < 300; i++) assert.ok(solve(Captcha.create().question) > 0);
  assert.deepEqual(Captcha.strip({ name: 'A', _captcha: '3', _captchaToken: 't' }), { name: 'A' });
});
