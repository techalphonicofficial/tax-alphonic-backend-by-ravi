const { AiSetting } = require('../models');
const { PROVIDERS } = require('./ai/providers');
const { encrypt, decrypt, maskSecret } = require('../utils/secretBox');
const { moduleLabel } = require('../utils/auditDescribe');
const { logger } = require('../config/logger');

const SCOPE = 'pseo';
const PROVIDER_KEYS = Object.keys(PROVIDERS);
const KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/;

// Used when nothing is saved yet, so generation keeps working off GEMINI_API_KEY in .env
const ENV_FALLBACK = { provider: 'gemini', model: 'gemini-3.5-flash' };

class HttpError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// ---------------------------------------------------------------------------
// Defaults (the values that used to be hardcoded in AiGenerationService)
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT = `You are a Principal Technical Content Architect & Enterprise SEO Specialist.
Your task is to generate comprehensive, publication-ready, long-form HTML content for an enterprise programmatic landing page.`;

const DEFAULT_SECTIONS = [
  {
    id: 'hero',
    name: 'Hero & Executive Value Proposition',
    icon: 'bi-stars',
    description: 'Compelling H1 headline, high-impact introductory hook, and value highlight badges/metrics.',
    instructions: 'Include an <h1> with a commanding, context-specific headline, an engaging 2-3 paragraph executive summary (~120 words), and a 3-badge key metrics highlight div.',
    targetWords: { comprehensive: 180, standard: 120, concise: 70 },
    enabled: true
  },
  {
    id: 'painPoints',
    name: 'Industry & Localized Challenges',
    icon: 'bi-exclamation-triangle',
    description: 'Deep-dive analysis of pain points specific to the industry/location/technology, and why legacy approaches fail.',
    instructions: 'Include an <h2> heading, 2 substantial paragraphs exploring why standard solutions fail in this specific industry/location, followed by 3 detailed callout cards (<div class="challenge-card ...">) outlining specific bottlenecks.',
    targetWords: { comprehensive: 250, standard: 150, concise: 80 },
    enabled: true
  },
  {
    id: 'solution',
    name: 'Tailored Solution & Strategic Architecture',
    icon: 'bi-diagram-3',
    description: 'How this specific service solves those challenges with modern architectural principles and competitive edge.',
    instructions: 'Include an <h2> heading, detailed architectural breakdown of the custom methodology, technical mechanisms, and competitive moat.',
    targetWords: { comprehensive: 280, standard: 180, concise: 90 },
    enabled: true
  },
  {
    id: 'features',
    name: 'Core Capabilities & Deliverables',
    icon: 'bi-grid-3x3-gap',
    description: '4-6 detailed feature breakdown cards with descriptive paragraphs, technical deliverables, and key capabilities.',
    instructions: 'Include an <h2> heading, intro paragraph, and a grid of 4 distinct feature cards (<div class="feature-item ...">) each having an <h3>, an icon class (Bootstrap Icons like bi-shield-check, bi-cpu, bi-graph-up, bi-layers), and 2-3 sentences of technical depth.',
    targetWords: { comprehensive: 300, standard: 200, concise: 100 },
    enabled: true
  },
  {
    id: 'methodology',
    name: 'Phased Implementation Roadmap',
    icon: 'bi-signpost-split',
    description: 'A 4-step execution lifecycle (Discovery, Architecture, Integration, Continuous Optimization) with concrete milestones.',
    instructions: 'Include an <h2> heading and a 4-phase structured timeline/process (<div class="process-step ...">) (e.g. Phase 1: Discovery & Technical Audit, Phase 2: Architecture Design, Phase 3: Phased Integration, Phase 4: Production Optimization) with clear milestones.',
    targetWords: { comprehensive: 240, standard: 160, concise: 80 },
    enabled: true
  },
  {
    id: 'roi',
    name: 'Measurable Business Impact & ROI',
    icon: 'bi-graph-up-arrow',
    description: 'Quantifiable efficiency gains, cost reductions, KPI improvements, and business risk mitigation metrics.',
    instructions: 'Include an <h2> heading, paragraph on quantifiable business value, and a 3-metric impact showcase (<div class="metric-card ...">) (e.g., 40% TCO reduction, 3x faster delivery, 99.99% operational reliability) with supporting narrative.',
    targetWords: { comprehensive: 220, standard: 140, concise: 70 },
    enabled: true
  },
  {
    id: 'faq',
    name: 'Interactive Frequently Asked Questions (FAQ)',
    icon: 'bi-question-circle',
    description: '4-5 in-depth technical and business Q&As targeting high-intent search queries, wrapped in interactive HTML accordions.',
    instructions: 'Include an <h2> heading and at least 4 in-depth FAQs formatted strictly as <details class="faq-accordion mb-4"><summary class="faq-question font-bold cursor-pointer">Question text?</summary><div class="faq-answer mt-2 text-gray-600">Comprehensive 2-3 sentence answer.</div></details>.',
    targetWords: { comprehensive: 260, standard: 160, concise: 90 },
    enabled: true
  },
  {
    id: 'cta',
    name: 'Strategic Call to Action (CTA)',
    icon: 'bi-megaphone',
    description: 'High-urgency closing conversion block directing the visitor toward scheduling an architecture consultation.',
    instructions: 'Include an <aside class="cta-banner ..."> with a compelling closing headline, a motivating value statement, and an action link/button text.',
    targetWords: { comprehensive: 120, standard: 80, concise: 40 },
    enabled: true
  }
];

const DEFAULT_TIERS = [
  {
    key: 'comprehensive',
    label: 'Comprehensive / In-Depth (Recommended)',
    badge: 'Recommended',
    targetWords: 1800,
    minWords: 1500,
    description: 'Long-form authoritative pillar content (~1,500 - 2,000 words) across all sections, ideal for maximum SEO ranking.'
  },
  {
    key: 'standard',
    label: 'Standard (~1,000 words)',
    badge: 'Balanced',
    targetWords: 1000,
    minWords: 850,
    description: 'Balanced multi-section layout (~850 - 1,100 words) providing thorough coverage.'
  },
  {
    key: 'concise',
    label: 'Concise (~500 words)',
    badge: 'Fast',
    targetWords: 500,
    minWords: 400,
    description: 'Brief, punchy overview (~400 - 600 words) suited for streamlined landing pages.'
  }
];

const DEFAULT_TONES = [
  { key: 'enterprise', name: 'Enterprise', description: 'Authoritative, enterprise-grade, polished B2B SaaS tone with executive vocabulary.' },
  { key: 'technical', name: 'Technical', description: 'Architecture-focused, high-rigor technical terminology emphasizing engineering best practices.' },
  { key: 'conversion', name: 'Conversion', description: 'Action-oriented, persuasive direct-response tone highlighting ROI, urgency, and competitive advantages.' }
];

const DEFAULT_GENERATION = {
  temperature: 0.7,
  maxOutputTokens: 16000,
  maxRetries: 3,
  timeoutSeconds: 300,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  defaultTier: 'comprehensive',
  defaultTone: 'enterprise'
};

const DEFAULTS = {
  generation: DEFAULT_GENERATION,
  sections: DEFAULT_SECTIONS,
  wordCountTiers: DEFAULT_TIERS,
  toneOptions: DEFAULT_TONES
};

const clampNumber = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
};

const str = (value, max = 500) => String(value ?? '').trim().slice(0, max);

class AiSettingsService {
  get defaults() {
    return DEFAULTS;
  }

  get providerList() {
    return PROVIDER_KEYS.map(key => ({ key, label: PROVIDERS[key].label }));
  }

  async _row() {
    const [row] = await AiSetting.findOrCreate({ where: { scope: SCOPE }, defaults: { scope: SCOPE } });
    return row;
  }

  // Full effective settings: stored values merged over defaults (keys still encrypted)
  async getEffective() {
    const row = await this._row();
    return {
      activeProvider: row.activeProvider || null,
      providers: row.providers || {},
      generation: { ...DEFAULT_GENERATION, ...(row.generation || {}) },
      sections: row.sections?.length ? row.sections : DEFAULT_SECTIONS,
      wordCountTiers: row.wordCountTiers?.length ? row.wordCountTiers : DEFAULT_TIERS,
      toneOptions: row.toneOptions?.length ? row.toneOptions : DEFAULT_TONES
    };
  }

  // Admin view: API keys replaced by a masked hint
  async getForAdmin() {
    const settings = await this.getEffective();
    const providers = {};
    PROVIDER_KEYS.forEach(key => {
      const stored = settings.providers[key] || {};
      const plain = decrypt(stored.apiKey);
      providers[key] = {
        model: stored.model || '',
        hasKey: Boolean(plain),
        keyHint: maskSecret(plain),
        keyUnreadable: Boolean(stored.apiKey) && !plain
      };
    });
    const resolved = await this.resolveActive(settings);
    return {
      ...settings,
      providers,
      providerList: this.providerList,
      active: resolved ? { provider: resolved.provider, label: PROVIDERS[resolved.provider].label, model: resolved.model, source: resolved.source } : null,
      defaults: DEFAULTS
    };
  }

  // Provider + key + model that generation should use, or null when nothing usable is configured
  async resolveActive(settings = null) {
    const s = settings || await this.getEffective();
    if (s.activeProvider && PROVIDERS[s.activeProvider]) {
      const stored = s.providers[s.activeProvider] || {};
      const apiKey = decrypt(stored.apiKey);
      if (apiKey && stored.model) return { provider: s.activeProvider, apiKey, model: stored.model, source: 'admin' };
    }
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey !== 'YOUR_API_KEY_HERE') {
      return { provider: ENV_FALLBACK.provider, apiKey: envKey, model: ENV_FALLBACK.model, source: 'env' };
    }
    return null;
  }

  async update(data = {}) {
    const row = await this._row();
    const errors = [];
    const current = row.providers || {};

    // Providers: a key is only replaced when a new one is typed; clearKey removes it
    const providers = { ...current };
    if (data.providers && typeof data.providers === 'object') {
      PROVIDER_KEYS.forEach(key => {
        const input = data.providers[key];
        if (!input || typeof input !== 'object') return;
        const next = { ...(current[key] || {}) };
        if (input.clearKey) delete next.apiKey;
        else if (typeof input.apiKey === 'string' && input.apiKey.trim()) next.apiKey = encrypt(input.apiKey.trim());
        if (input.model !== undefined) next.model = str(input.model, 150);
        providers[key] = next;
      });
    }

    let activeProvider = row.activeProvider;
    if (data.activeProvider !== undefined) {
      if (data.activeProvider && !PROVIDERS[data.activeProvider]) {
        errors.push({ field: 'activeProvider', message: 'Unknown AI provider' });
      } else if (data.activeProvider) {
        const p = providers[data.activeProvider] || {};
        if (!decrypt(p.apiKey)) errors.push({ field: 'activeProvider', message: `Add an API key for ${PROVIDERS[data.activeProvider].label} before making it active` });
        if (!p.model) errors.push({ field: 'activeProvider', message: `Choose a model for ${PROVIDERS[data.activeProvider].label} before making it active` });
        activeProvider = data.activeProvider;
      } else {
        activeProvider = null;
      }
    }

    const wordCountTiers = data.wordCountTiers !== undefined ? this._normalizeTiers(data.wordCountTiers, errors) : row.wordCountTiers;
    const toneOptions = data.toneOptions !== undefined ? this._normalizeTones(data.toneOptions, errors) : row.toneOptions;
    const tierKeys = (wordCountTiers?.length ? wordCountTiers : DEFAULT_TIERS).map(t => t.key);
    const toneKeys = (toneOptions?.length ? toneOptions : DEFAULT_TONES).map(t => t.key);
    const sections = data.sections !== undefined ? this._normalizeSections(data.sections, tierKeys, errors) : row.sections;
    const generation = data.generation !== undefined
      ? this._normalizeGeneration(data.generation, tierKeys, toneKeys, errors)
      : row.generation;

    if (errors.length > 0) throw new HttpError('AI settings validation failed', 422, errors);

    const before = await this.getForAdmin();
    await row.update({ activeProvider, providers, generation, sections, wordCountTiers, toneOptions });
    const after = await this.getForAdmin();
    await this._audit(before, after);
    return after;
  }

  // One audit entry per save; uses the masked admin view so keys never reach the log
  async _audit(before, after) {
    const keys = ['activeProvider', 'providers', 'generation', 'sections', 'wordCountTiers', 'toneOptions'];
    const changed = keys.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (changed.length === 0) return;
    const pick = (obj) => Object.fromEntries(changed.map(k => [k, obj[k] ?? null]));
    try {
      // Lazy require, same as utils/auditHooks
      const AuditLogService = require('./AuditLogService');
      await AuditLogService.record({
        action: 'UPDATE',
        module: moduleLabel('AiSetting'),
        recordId: SCOPE,
        description: `Updated pSEO AI settings: ${changed.join(', ')}`,
        oldData: pick(before),
        newData: pick(after)
      });
    } catch (err) {
      logger.warn(`AI settings audit failed: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Provider calls from the settings screen
  // ---------------------------------------------------------------------------

  async _keyFor(provider, apiKey) {
    if (!PROVIDERS[provider]) throw new HttpError('Unknown AI provider', 422, [{ field: 'provider', message: 'Unknown AI provider' }]);
    if (apiKey && String(apiKey).trim()) return String(apiKey).trim();
    const { providers } = await this.getEffective();
    const saved = decrypt(providers[provider]?.apiKey);
    if (!saved) throw new HttpError(`Enter an API key for ${PROVIDERS[provider].label} first`, 422, [{ field: 'apiKey', message: 'API key is required' }]);
    return saved;
  }

  async listModels(provider, apiKey) {
    const key = await this._keyFor(provider, apiKey);
    try {
      return await PROVIDERS[provider].listModels(key);
    } catch (err) {
      throw new HttpError(err.message, 502);
    }
  }

  // Sends a tiny prompt to confirm the key + model pair actually works
  async testConnection(provider, apiKey, model) {
    const key = await this._keyFor(provider, apiKey);
    const { providers } = await this.getEffective();
    const useModel = str(model, 150) || providers[provider]?.model;
    if (!useModel) throw new HttpError('Choose a model first', 422, [{ field: 'model', message: 'Model is required' }]);
    const started = Date.now();
    try {
      const text = await PROVIDERS[provider].generate({
        apiKey: key,
        model: useModel,
        prompt: 'Reply with the single word: OK',
        maxTokens: 512,
        timeoutMs: 60000
      });
      return { provider, model: useModel, reply: str(text, 100), latencyMs: Date.now() - started };
    } catch (err) {
      throw new HttpError(err.message, 502);
    }
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  _normalizeGeneration(raw, tierKeys, toneKeys, errors) {
    const g = raw && typeof raw === 'object' ? raw : {};
    const systemPrompt = str(g.systemPrompt, 10000);
    if (!systemPrompt) errors.push({ field: 'generation.systemPrompt', message: 'System prompt cannot be empty' });
    const defaultTier = tierKeys.includes(g.defaultTier) ? g.defaultTier : tierKeys[0];
    const defaultTone = toneKeys.includes(g.defaultTone) ? g.defaultTone : toneKeys[0];
    return {
      temperature: clampNumber(g.temperature, 0, 2, DEFAULT_GENERATION.temperature),
      maxOutputTokens: Math.round(clampNumber(g.maxOutputTokens, 256, 128000, DEFAULT_GENERATION.maxOutputTokens)),
      maxRetries: Math.round(clampNumber(g.maxRetries, 1, 5, DEFAULT_GENERATION.maxRetries)),
      timeoutSeconds: Math.round(clampNumber(g.timeoutSeconds, 30, 900, DEFAULT_GENERATION.timeoutSeconds)),
      systemPrompt,
      defaultTier,
      defaultTone
    };
  }

  _uniqueKeys(list, keyName, label, field, errors) {
    const seen = new Set();
    list.forEach((item, i) => {
      if (!KEY_REGEX.test(item[keyName])) {
        errors.push({ field: `${field}[${i}].${keyName}`, message: `${label} #${i + 1}: key must start with a letter and use only letters, numbers, - or _` });
      } else if (seen.has(item[keyName])) {
        errors.push({ field: `${field}[${i}].${keyName}`, message: `${label} #${i + 1}: duplicate key "${item[keyName]}"` });
      }
      seen.add(item[keyName]);
    });
  }

  _normalizeTiers(raw, errors) {
    if (!Array.isArray(raw) || raw.length === 0) {
      errors.push({ field: 'wordCountTiers', message: 'Add at least one word count tier' });
      return [];
    }
    const tiers = raw.map(t => {
      const targetWords = Math.round(clampNumber(t?.targetWords, 100, 10000, 1000));
      return {
        key: str(t?.key, 50),
        label: str(t?.label, 150),
        badge: str(t?.badge, 50),
        targetWords,
        minWords: Math.round(clampNumber(t?.minWords, 50, targetWords, Math.round(targetWords * 0.85))),
        description: str(t?.description, 1000)
      };
    });
    this._uniqueKeys(tiers, 'key', 'Tier', 'wordCountTiers', errors);
    tiers.forEach((t, i) => { if (!t.label) errors.push({ field: `wordCountTiers[${i}].label`, message: `Tier #${i + 1}: label is required` }); });
    return tiers;
  }

  _normalizeTones(raw, errors) {
    if (!Array.isArray(raw) || raw.length === 0) {
      errors.push({ field: 'toneOptions', message: 'Add at least one tone' });
      return [];
    }
    const tones = raw.map(t => ({ key: str(t?.key, 50), name: str(t?.name, 100), description: str(t?.description, 2000) }));
    this._uniqueKeys(tones, 'key', 'Tone', 'toneOptions', errors);
    tones.forEach((t, i) => {
      if (!t.name) errors.push({ field: `toneOptions[${i}].name`, message: `Tone #${i + 1}: name is required` });
      if (!t.description) errors.push({ field: `toneOptions[${i}].description`, message: `Tone #${i + 1}: description (the instruction sent to the AI) is required` });
    });
    return tones;
  }

  _normalizeSections(raw, tierKeys, errors) {
    if (!Array.isArray(raw) || raw.length === 0) {
      errors.push({ field: 'sections', message: 'Add at least one content section' });
      return [];
    }
    const sections = raw.map(s => {
      const rawTargets = s?.targetWords && typeof s.targetWords === 'object' ? s.targetWords : {};
      const targetWords = {};
      tierKeys.forEach(k => { targetWords[k] = Math.round(clampNumber(rawTargets[k], 10, 5000, 150)); });
      return {
        id: str(s?.id, 50),
        name: str(s?.name, 200),
        icon: str(s?.icon, 50) || 'bi-card-text',
        description: str(s?.description, 2000),
        instructions: str(s?.instructions, 5000),
        targetWords,
        enabled: s?.enabled !== false
      };
    });
    this._uniqueKeys(sections, 'id', 'Section', 'sections', errors);
    sections.forEach((s, i) => { if (!s.name) errors.push({ field: `sections[${i}].name`, message: `Section #${i + 1}: name is required` }); });
    if (!sections.some(s => s.enabled)) errors.push({ field: 'sections', message: 'Keep at least one section enabled' });
    return sections;
  }
}

module.exports = new AiSettingsService();
module.exports.HttpError = HttpError;
