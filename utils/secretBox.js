const crypto = require('crypto');

// AES-256-GCM for secrets stored in the database (AI provider API keys).
// Key comes from AI_SETTINGS_SECRET, falling back to JWT_SECRET. If that secret
// changes, stored keys can no longer be decrypted and must be entered again.
const PREFIX = 'enc:v1:';

const getKey = () => {
  const secret = process.env.AI_SETTINGS_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('AI_SETTINGS_SECRET (or JWT_SECRET) must be set to store API keys');
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join(':');
};

// Returns null when the value cannot be decrypted (wrong secret or tampered)
const decrypt = (value) => {
  if (!value || !String(value).startsWith(PREFIX)) return null;
  try {
    const [iv, tag, data] = String(value).slice(PREFIX.length).split(':').map(s => Buffer.from(s, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
};

// "sk-...wxyz" style hint for showing a saved key without revealing it
const maskSecret = (plain) => {
  if (!plain) return '';
  const s = String(plain);
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 3)}…${s.slice(-4)}`;
};

module.exports = { encrypt, decrypt, maskSecret };
