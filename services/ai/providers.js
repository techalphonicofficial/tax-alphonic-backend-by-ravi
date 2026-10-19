// REST adapters for the supported AI providers. Each exposes:
//   listModels(apiKey)                      -> [{ id, name }]
//   generate({ apiKey, model, system, prompt, temperature, maxTokens, json, timeoutMs }) -> text
// Errors carry `status` (HTTP code) and `retryable` so the caller can decide to retry.

class ProviderError extends Error {
  constructor(message, status = 0, retryable = false) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500;

const request = async (provider, url, { method = 'GET', headers = {}, body, timeoutMs = 30000 } = {}) => {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    throw new ProviderError(`${provider}: ${timedOut ? `request timed out after ${Math.round(timeoutMs / 1000)}s` : err.message}`, 0, true);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON error body */ }

  if (!res.ok) {
    const detail = data?.error?.message || data?.message || text.slice(0, 300) || res.statusText;
    const hint = res.status === 401 || res.status === 403 ? ' (check the API key)' : '';
    throw new ProviderError(`${provider} ${res.status}: ${detail}${hint}`, res.status, isRetryableStatus(res.status));
  }
  return data;
};

// Some models (reasoning models) only accept their default temperature
const rejectsTemperature = (err) => err.status === 400 && /temperature/i.test(err.message);

const byName = (a, b) => a.id.localeCompare(b.id);

const openai = {
  label: 'OpenAI',
  async listModels(apiKey) {
    const data = await request('OpenAI', 'https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${apiKey}` }
    });
    // Only text/chat models are useful for content generation
    const excluded = /(embedding|whisper|tts|dall-e|davinci|babbage|moderation|audio|realtime|transcribe|image|search|instruct|computer-use)/i;
    return (data?.data || [])
      .filter(m => /^(gpt-|o\d|chatgpt-)/i.test(m.id) && !excluded.test(m.id))
      .map(m => ({ id: m.id, name: m.id }))
      .sort(byName);
  },
  async generate({ apiKey, model, system, prompt, temperature, maxTokens, json, timeoutMs }) {
    const call = (withTemperature) => request('OpenAI', 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      timeoutMs,
      headers: { authorization: `Bearer ${apiKey}` },
      body: {
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: maxTokens,
        ...(withTemperature && temperature != null ? { temperature } : {}),
        ...(json ? { response_format: { type: 'json_object' } } : {})
      }
    });
    let data;
    try {
      data = await call(true);
    } catch (err) {
      if (!rejectsTemperature(err)) throw err;
      data = await call(false);
    }
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new ProviderError('OpenAI: output was cut off at the max output tokens limit. Increase it in AI Settings.', 0, false);
    }
    return choice?.message?.content || '';
  }
};

const anthropic = {
  label: 'Claude (Anthropic)',
  headers: (apiKey) => ({ 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
  async listModels(apiKey) {
    const data = await request('Anthropic', 'https://api.anthropic.com/v1/models?limit=1000', {
      headers: this.headers(apiKey)
    });
    return (data?.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
  },
  async generate({ apiKey, model, system, prompt, temperature, maxTokens, timeoutMs }) {
    const call = (withTemperature) => request('Anthropic', 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      timeoutMs,
      headers: this.headers(apiKey),
      body: {
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
        ...(withTemperature && temperature != null ? { temperature: Math.min(temperature, 1) } : {})
      }
    });
    let data;
    try {
      data = await call(true);
    } catch (err) {
      if (!rejectsTemperature(err)) throw err;
      data = await call(false);
    }
    if (data?.stop_reason === 'max_tokens') {
      throw new ProviderError('Anthropic: output was cut off at the max output tokens limit. Increase it in AI Settings.', 0, false);
    }
    return (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  }
};

const gemini = {
  label: 'Google Gemini',
  base: 'https://generativelanguage.googleapis.com/v1beta',
  async listModels(apiKey) {
    const data = await request('Gemini', `${this.base}/models?pageSize=1000`, {
      headers: { 'x-goog-api-key': apiKey }
    });
    return (data?.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name))
      .filter(m => !/(tts|image|embedding|computer-use|native-audio|live|robotics)/i.test(m.name))
      .map(m => ({ id: m.name.replace(/^models\//, ''), name: m.displayName || m.name }))
      .sort(byName);
  },
  async generate({ apiKey, model, system, prompt, temperature, maxTokens, json, timeoutMs }) {
    const data = await request('Gemini', `${this.base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      timeoutMs,
      headers: { 'x-goog-api-key': apiKey },
      body: {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          ...(temperature != null ? { temperature } : {}),
          ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
          ...(json ? { responseMimeType: 'application/json' } : {})
        }
      }
    });
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      const reason = data?.promptFeedback?.blockReason;
      throw new ProviderError(`Gemini returned no content${reason ? ` (blocked: ${reason})` : ''}`, 0, !reason);
    }
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new ProviderError('Gemini: output was cut off at the max output tokens limit. Increase it in AI Settings.', 0, false);
    }
    return (candidate.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  }
};

const PROVIDERS = { openai, anthropic, gemini };

module.exports = { PROVIDERS, ProviderError };
