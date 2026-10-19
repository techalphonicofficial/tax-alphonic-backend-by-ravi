const { logger } = require('../config/logger');
const AiSettingsService = require('./AiSettingsService');
const { PROVIDERS } = require('./ai/providers');

// Provider, model, prompt, sections, tiers and tones all come from the admin panel
// (pSEO > AI Settings, stored by AiSettingsService). Only the JSON output contract
// below stays in code, because the response parser depends on it.
class AiGenerationService {
    // Options for the generation modal in the admin panel
    async getConfig() {
        const settings = await AiSettingsService.getEffective();
        const active = await AiSettingsService.resolveActive(settings);
        const sections = settings.sections.filter(s => s.enabled !== false);
        return {
            availableSections: sections,
            wordCountTiers: settings.wordCountTiers,
            toneOptions: settings.toneOptions,
            defaultTier: settings.generation.defaultTier,
            defaultTone: settings.generation.defaultTone,
            defaultSections: sections.map(s => s.id),
            engine: active
                ? { provider: active.provider, label: PROVIDERS[active.provider].label, model: active.model, source: active.source }
                : null
        };
    }

    async generateContentForPage(seoPageData, options = {}) {
        const settings = await AiSettingsService.getEffective();
        const active = await AiSettingsService.resolveActive(settings);
        if (!active) {
            throw new Error('No AI provider is configured. Add an API key and model in pSEO > AI Settings.');
        }

        const gen = settings.generation;
        const tiersByKey = new Map(settings.wordCountTiers.map(t => [t.key, t]));
        const sectionsById = new Map(settings.sections.filter(s => s.enabled !== false).map(s => [s.id, s]));
        const tonesByKey = new Map(settings.toneOptions.map(t => [t.key, t]));

        const tierKey = tiersByKey.has(options.wordCountTier)
            ? options.wordCountTier
            : (tiersByKey.has(options.wordCount) ? options.wordCount : gen.defaultTier);
        const tier = tiersByKey.get(tierKey) || settings.wordCountTiers[0];
        const requestedSections = (Array.isArray(options.sections) && options.sections.length > 0
            ? options.sections
            : [...sectionsById.keys()]
        ).filter(id => sectionsById.has(id));
        if (requestedSections.length === 0) {
            throw new Error('None of the requested sections are enabled in AI Settings.');
        }
        const tone = tonesByKey.get(options.tone) || tonesByKey.get(gen.defaultTone) || settings.toneOptions[0];
        const engine = `${PROVIDERS[active.provider].label} (${active.model})`;

        try {
            const prompt = this._buildContextualPrompt(seoPageData, {
                tier,
                sections: requestedSections.map(id => sectionsById.get(id)),
                tone,
                customWordCount: typeof options.wordCount === 'number' ? options.wordCount : null
            });

            let lastError = null;
            let text = '';
            for (let attempt = 1; attempt <= gen.maxRetries; attempt++) {
                try {
                    text = await PROVIDERS[active.provider].generate({
                        apiKey: active.apiKey,
                        model: active.model,
                        system: gen.systemPrompt,
                        prompt,
                        temperature: gen.temperature,
                        maxTokens: gen.maxOutputTokens,
                        json: true,
                        timeoutMs: gen.timeoutSeconds * 1000
                    });
                    if (text) break;
                    lastError = new Error(`Empty response from ${engine}.`);
                } catch (err) {
                    lastError = err;
                    // Bad key, unknown model, truncated output: retrying will not help
                    if (err.retryable === false) break;
                    logger.warn(`${engine} attempt ${attempt} failed: ${err.message}. Retrying...`);
                }
                if (attempt < gen.maxRetries) {
                    await new Promise(r => setTimeout(r, 1500 * attempt));
                }
            }

            if (!text) {
                throw lastError || new Error(`No response received from ${engine}.`);
            }

            const parsed = this._parseResponse(text);

            // Clean up html content: strip any lingering markdown fences
            let cleanHtml = parsed.htmlContent || text;
            cleanHtml = cleanHtml.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

            const actualWords = this._countWords(cleanHtml);
            const qualityScore = this._calculateQualityScore(actualWords, tier.minWords, requestedSections.length, sectionsById.size);

            return {
                rawOutput: cleanHtml,
                metaTitle: parsed.metaTitle || seoPageData.metaTitle || seoPageData.title,
                metaDescription: parsed.metaDescription || seoPageData.metaDescription,
                qualityScore,
                wordCount: actualWords,
                sectionsGenerated: requestedSections,
                faqs: parsed.faqs || [],
                engine: { provider: active.provider, model: active.model },
                success: true
            };
        } catch (error) {
            logger.error(`AI Generation Error (${engine}): ${error.message}`);
            throw new Error(`AI Engine Failure: ${error.message}`);
        }
    }

    // Providers without a JSON mode may wrap the object in prose or code fences
    _parseResponse(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end > start) {
                try {
                    return JSON.parse(text.slice(start, end + 1));
                } catch (inner) { /* fall through */ }
            }
            logger.warn(`Failed to parse AI response as JSON: ${e.message}. Fallback to regex.`);
            return this._fallbackParse(text);
        }
    }

    _buildContextualPrompt(page, { tier, sections, tone, customWordCount }) {
        const targetTotalWords = customWordCount || tier.targetWords;
        const minTotalWords = customWordCount ? Math.round(customWordCount * 0.85) : tier.minWords;

        let prompt = `==============================
CRITICAL WORD COUNT REQUIREMENT:
Target Total Word Count: AT LEAST ${minTotalWords} - ${targetTotalWords} words.
DO NOT WRITE SHORT OR BRIEF SUMMARIES. Each requested section must be thoroughly elaborated with in-depth technical analysis, concrete scenarios, and actionable insights.
Tone: ${tone.description}
==============================

PAGE CONTEXT:
`;

        if (page.service) {
            prompt += `- Target Service: "${page.service.title}"\n`;
            prompt += `- Service Overview: "${page.service.shortDescription || 'Enterprise software and architecture service.'}"\n`;
        }
        if (page.location) {
            prompt += `- Geographic Target: "${page.location.name}"\n`;
            if (page.location.description) prompt += `- Local Regional Context: "${page.location.description}"\n`;
        }
        if (page.industry) {
            prompt += `- Industry Vertical: "${page.industry.name}"\n`;
            if (page.industry.description) prompt += `- Industry Pain Points / Dynamics: "${page.industry.description}"\n`;
        }
        if (page.technology) {
            prompt += `- Technology Stack: "${page.technology.name}" (${page.technology.category || 'Framework'})\n`;
        }
        if (page.problem) {
            prompt += `- Core Problem / Business Need: "${page.problem.name}"\n`;
            if (page.problem.description) prompt += `- Problem Landscape: "${page.problem.description}"\n`;
        }

        prompt += `\n==============================
REQUIRED SECTIONS TO GENERATE:
`;

        sections.forEach(secDef => {
            const targetW = secDef.targetWords?.[tier.key] || 200;
            prompt += `
### SECTION [${secDef.id}]: "${secDef.name}" (Target: ~${targetW} words minimum)
- Instructions: ${secDef.description}
- Structure as HTML: <section id="${secDef.id}" data-section="${secDef.id}" class="content-section section-${secDef.id} my-12">
`;
            if (secDef.instructions) {
                prompt += `  ${secDef.instructions}\n`;
            }
        });

        prompt += `\n==============================
OUTPUT FORMAT REQUIREMENTS:
Output STRICTLY a JSON object matching this schema without markdown fences:
{
  "metaTitle": "SEO Page Title under 60 characters incorporating primary service and context",
  "metaDescription": "Compelling meta description between 140-160 characters summarizing the page and driving clicks",
  "estimatedWordCount": <number>,
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "htmlContent": "<section id=\\"hero\\"...>...</section>..."
}

CRITICAL RULES:
1. Ensure the generated htmlContent has AT LEAST ${minTotalWords} total words across all sections combined.
2. The HTML must use clean semantic tags styled ONLY with Tailwind CSS (v3) utility classes in class="..." (e.g. text-3xl font-bold mb-4, grid grid-cols-1 md:grid-cols-3 gap-6, p-6 bg-white rounded-lg border). Do NOT use Bootstrap classes (row, col-*, card, btn, ...), inline style attributes or <style>/<script> tags. The only exception is icons: <i class="bi bi-ICON-NAME"></i> (Bootstrap Icons names).
3. Do NOT include markdown code fences like \\\`\\\`\\\`json or \\\`\\\`\\\`html. Return the raw JSON object directly.`;

        return prompt;
    }

    _fallbackParse(rawText) {
        let clean = rawText.replace(/^```json\s*/i, '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e) {
            // Extract HTML if embedded
            const htmlMatch = clean.match(/<section[\s\S]*<\/section>/i) || clean.match(/<h1[\s\S]*<\/p>/i);
            const htmlContent = htmlMatch ? htmlMatch[0] : clean;
            return {
                metaTitle: null,
                metaDescription: null,
                faqs: [],
                htmlContent
            };
        }
    }

    _countWords(str) {
        if (!str) return 0;
        const textOnly = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return textOnly ? textOnly.split(/\s+/).length : 0;
    }

    _calculateQualityScore(actualWords, targetMinWords, sectionCount, totalSections = 8) {
        let score = 50; // base score

        // Word count ratio (up to 30 pts)
        const wordRatio = Math.min(actualWords / (targetMinWords || 1000), 1.5);
        score += Math.round(Math.min(wordRatio * 20, 30));

        // Section coverage (up to 20 pts)
        const sectionScore = Math.min((sectionCount / (totalSections || 1)) * 20, 20);
        score += Math.round(sectionScore);

        return Math.min(Math.max(score, 10), 100);
    }
}

module.exports = new AiGenerationService();
