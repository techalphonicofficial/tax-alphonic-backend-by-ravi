const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PROVIDERS, catalog } = require('./providers');
const { encrypt, decrypt, maskSecret } = require('../../utils/secretBox');
const { logger } = require('../../config/logger');

/**
 * Where media files are stored (admin: Media → Media Settings).
 *
 * Settings live in the storage_settings table (one row): activeProvider ('local' by default =
 * this project's uploads/ folder) and providers.{key} = that provider's fields, secrets
 * encrypted. Every saved provider is kept, so files uploaded to a provider that is no longer
 * active can still be deleted.
 *
 * upload() stores a buffer with the ACTIVE provider and returns { url, storageType, storageKey };
 * remove() deletes a file from the provider it was stored with.
 */

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const TEST_KEY = '.taxalphonic-connection-test.txt';

let cache = null; // { row, at }
const CACHE_MS = 30 * 1000;

const trimSlashes = (value) => String(value || '').trim().replace(/^\/+|\/+$/g, '');

function secretKeys(provider) {
  return (PROVIDERS[provider]?.fields || []).filter((f) => f.secret).map((f) => f.key);
}

async function getRow() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.row;
  const { StorageSetting } = require('../../models');
  let row = await StorageSetting.findOne({ order: [['createdAt', 'ASC']] });
  if (!row) row = await StorageSetting.create({ activeProvider: 'local', providers: {} });
  cache = { row, at: Date.now() };
  return row;
}

function invalidate() {
  cache = null;
}

/** A provider's saved settings with secrets decrypted (for internal use only). */
function plainConfig(row, provider) {
  const stored = { ...(row.providers?.[provider] || {}) };
  secretKeys(provider).forEach((key) => {
    stored[key] = decrypt(stored[key]) || '';
  });
  return stored;
}

/** Fields a provider needs that are missing from cfg. */
function missingFields(provider, cfg) {
  const def = PROVIDERS[provider];
  if (!def) return ['provider'];
  const missing = def.fields.filter((f) => f.required && !String(cfg[f.key] ?? '').trim()).map((f) => f.label);
  if (def.requiredPublicUrl && !String(cfg.publicUrl || '').trim()) missing.push('Public URL');
  return missing;
}

function clientFor(provider, cfg) {
  const def = PROVIDERS[provider];
  return new S3Client({
    region: def.region ? def.region(cfg) : cfg.region || 'us-east-1',
    endpoint: def.endpoint ? def.endpoint(cfg) || undefined : undefined,
    forcePathStyle: Boolean(def.pathStyle || cfg.pathStyle),
    credentials: { accessKeyId: String(cfg.accessKeyId).trim(), secretAccessKey: String(cfg.secretAccessKey).trim() },
  });
}

function publicUrlFor(provider, cfg, key) {
  const def = PROVIDERS[provider];
  const base = String(cfg.publicUrl || '').trim().replace(/\/+$/, '') || (def.publicBase ? def.publicBase(cfg) : '');
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function keyFor(cfg, filename) {
  const folder = trimSlashes(cfg.folder) || 'uploads';
  return `${folder}/${filename}`;
}

async function putObject(provider, cfg, key, body, contentType) {
  const def = PROVIDERS[provider];
  const useAcl = def.acl || cfg.acl;
  await clientFor(provider, cfg).send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    ...(useAcl ? { ACL: 'public-read' } : {}),
  }));
}

/** Readable message from an AWS SDK error. */
function describeError(error) {
  const code = error?.Code || error?.name || '';
  const status = error?.$metadata?.httpStatusCode;
  const hints = {
    InvalidAccessKeyId: 'The access key ID is wrong.',
    SignatureDoesNotMatch: 'The secret key is wrong.',
    NoSuchBucket: 'The bucket does not exist (check the name and region).',
    AccessDenied: 'The keys have no permission to write to this bucket.',
    PermanentRedirect: 'The bucket is in a different region.',
    AuthorizationHeaderMalformed: 'The region does not match the bucket.',
    AccessControlListNotSupported: 'The bucket blocks ACLs: allow public reads with a bucket policy instead.',
  };
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') return `Cannot reach the endpoint (${error.code}). Check the endpoint / region.`;
  return hints[code] || `${code || 'Error'}${status ? ` (HTTP ${status})` : ''}: ${error?.message || 'request failed'}`;
}

class StorageService {
  catalog() {
    return catalog();
  }

  /** Admin view: active provider and every provider's settings, secrets masked. */
  async getForAdmin() {
    const row = await getRow();
    const providers = {};
    Object.keys(PROVIDERS).forEach((key) => {
      if (key === 'local') return;
      const stored = row.providers?.[key];
      if (!stored) return;
      const view = { ...stored };
      secretKeys(key).forEach((secretKey) => {
        const plain = decrypt(stored[secretKey]);
        view[secretKey] = '';
        view[`${secretKey}Hint`] = plain ? maskSecret(plain) : '';
      });
      providers[key] = view;
    });
    return { activeProvider: row.activeProvider, providers, lastTest: row.lastTest || null };
  }

  /** Settings typed in the form, with saved secrets filled in where the field was left empty. */
  async mergeWithSaved(provider, input = {}) {
    const row = await getRow();
    const saved = plainConfig(row, provider);
    const cfg = { ...saved };
    (PROVIDERS[provider]?.fields || []).forEach((field) => {
      const value = input[field.key];
      if (field.type === 'switch') cfg[field.key] = Boolean(value);
      else if (field.secret) {
        if (typeof value === 'string' && value.trim()) cfg[field.key] = value.trim();
      } else if (value !== undefined) cfg[field.key] = String(value ?? '').trim();
    });
    return cfg;
  }

  /**
   * Connection test: upload a small file, read it back through its public URL, delete it.
   * Returns { ok, steps: [{ step, ok, message }], publicUrl }.
   */
  async testConnection(provider, input = {}) {
    if (provider === 'local') {
      try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const file = path.join(UPLOADS_DIR, TEST_KEY);
        fs.writeFileSync(file, 'ok');
        fs.unlinkSync(file);
        return { ok: true, steps: [{ step: 'Write to uploads/ folder', ok: true, message: UPLOADS_DIR }] };
      } catch (error) {
        return { ok: false, steps: [{ step: 'Write to uploads/ folder', ok: false, message: error.message }] };
      }
    }
    if (!PROVIDERS[provider]) return { ok: false, steps: [{ step: 'Provider', ok: false, message: 'Unknown provider' }] };

    const cfg = await this.mergeWithSaved(provider, input);
    const missing = missingFields(provider, cfg);
    if (missing.length) return { ok: false, steps: [{ step: 'Settings', ok: false, message: `Fill in: ${missing.join(', ')}` }] };

    const steps = [];
    const key = keyFor(cfg, TEST_KEY);
    const body = `Tax Alphonic storage test ${new Date().toISOString()}`;
    try {
      await putObject(provider, cfg, key, body, 'text/plain');
      steps.push({ step: 'Upload a test file', ok: true, message: `${cfg.bucket}/${key}` });
    } catch (error) {
      steps.push({ step: 'Upload a test file', ok: false, message: describeError(error) });
      return { ok: false, steps };
    }

    const url = publicUrlFor(provider, cfg, key);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = response.ok ? await response.text() : '';
      const readable = response.ok && text === body;
      steps.push({
        step: 'Open it from the public URL',
        ok: readable,
        message: readable ? url : `HTTP ${response.status} at ${url} — files would upload but not show on the website. Make the bucket public or set the right Public URL.`,
      });
    } catch (error) {
      steps.push({ step: 'Open it from the public URL', ok: false, message: `${url}: ${error.message}` });
    }

    try {
      await clientFor(provider, cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
      steps.push({ step: 'Delete the test file', ok: true, message: 'Done' });
    } catch (error) {
      steps.push({ step: 'Delete the test file', ok: false, message: describeError(error) });
    }

    return { ok: steps.every((s) => s.ok), steps, publicUrl: url };
  }

  /**
   * Saves a provider's settings and (optionally) makes it the active one. A cloud provider is
   * only activated after a successful connection test with the settings being saved.
   */
  async save({ activeProvider, provider, settings = {}, activate = true } = {}) {
    const target = provider || activeProvider || 'local';
    if (!PROVIDERS[target]) throw Object.assign(new Error('Unknown storage provider'), { status: 422 });

    const row = await getRow();
    const providers = { ...(row.providers || {}) };
    let test = null;

    if (target !== 'local') {
      const cfg = await this.mergeWithSaved(target, settings);
      const missing = missingFields(target, cfg);
      if (missing.length) throw Object.assign(new Error(`Fill in: ${missing.join(', ')}`), { status: 422 });

      if (activate) {
        test = await this.testConnection(target, settings);
        if (!test.ok) {
          const failed = test.steps.find((s) => !s.ok);
          throw Object.assign(new Error(`Connection test failed — ${failed?.step}: ${failed?.message}`), { status: 422, test });
        }
      }

      const stored = { ...cfg };
      secretKeys(target).forEach((key) => {
        stored[key] = cfg[key] ? encrypt(cfg[key]) : '';
      });
      providers[target] = stored;
    }

    row.providers = providers;
    if (activate) row.activeProvider = target;
    if (test) row.lastTest = { provider: target, ok: test.ok, at: new Date().toISOString(), steps: test.steps };
    await row.save();
    invalidate();
    return { settings: await this.getForAdmin(), test };
  }

  /** Stores a file with the active provider. */
  async upload(buffer, filename, mimeType) {
    const row = await getRow();
    const provider = PROVIDERS[row.activeProvider] ? row.activeProvider : 'local';

    if (provider === 'local') {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      return { url: `/uploads/${filename}`, storageType: 'local', storageKey: `uploads/${filename}` };
    }

    const cfg = plainConfig(row, provider);
    const key = keyFor(cfg, filename);
    try {
      await putObject(provider, cfg, key, buffer, mimeType);
    } catch (error) {
      logger.error(`Storage upload (${provider}) failed: ${error.message}`);
      throw new Error(`Upload to ${PROVIDERS[provider].label} failed: ${describeError(error)}`);
    }
    return { url: publicUrlFor(provider, cfg, key), storageType: provider, storageKey: key };
  }

  /** Deletes a stored file (media row or { url, storageType, storageKey }). Never throws. */
  async remove(file) {
    if (!file?.url && !file?.storageKey) return;
    const provider = file.storageType || 'local';
    try {
      if (provider === 'local') {
        const name = path.basename(file.storageKey || file.url);
        const filePath = path.join(UPLOADS_DIR, name);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return;
      }
      if (!PROVIDERS[provider]) return;
      const row = await getRow();
      const cfg = plainConfig(row, provider);
      if (missingFields(provider, cfg).length) {
        logger.warn(`Storage delete skipped: ${provider} is no longer configured (${file.url})`);
        return;
      }
      const key = file.storageKey || decodeURIComponent(new URL(file.url).pathname).replace(/^\/+/, '');
      await clientFor(provider, cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    } catch (error) {
      logger.error(`Storage delete (${provider}) failed for ${file.url}: ${error.message}`);
    }
  }

  /**
   * For routes that receive a file through multer's disk storage (banners, team, partners, ...):
   * keeps it in uploads/ when storage is local, else moves it to the active cloud provider.
   * Returns the URL to save.
   */
  async storeDiskUpload(file) {
    const row = await getRow();
    if (!PROVIDERS[row.activeProvider] || row.activeProvider === 'local') return `/uploads/${file.filename}`;
    const buffer = fs.readFileSync(file.path);
    const { url } = await this.upload(buffer, file.filename, file.mimetype);
    try { fs.unlinkSync(file.path); } catch { /* already gone */ }
    return url;
  }
}

module.exports = new StorageService();
