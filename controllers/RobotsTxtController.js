const { Setting } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

/*
 * Custom robots.txt (admin: SEO → Robots.txt). Stored in `settings` (group "seo"):
 * robots_txt (text) and robots_txt_enabled (boolean). While enabled, the website serves this
 * text at /robots.txt; otherwise its automatic robots.txt (app/robots.txt/route.js).
 */
const GROUP = 'seo';
const KEY = 'robots_txt';
const ENABLED_KEY = 'robots_txt_enabled';
const MAX_BYTES = 64 * 1024;

async function read() {
  const rows = await Setting.findAll({ where: { group: GROUP, key: [KEY, ENABLED_KEY] } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const content = byKey[KEY]?.value || '';
  const enabled = byKey[ENABLED_KEY]?.value === 'true' && content.trim() !== '';
  const updatedAt = [byKey[KEY]?.updatedAt, byKey[ENABLED_KEY]?.updatedAt].filter(Boolean).sort().pop() || null;
  return { content, enabled, updatedAt };
}

async function write(key, value, type) {
  const [row, created] = await Setting.findOrCreate({
    where: { group: GROUP, key },
    defaults: { group: GROUP, key, value, type, isPublic: false },
  });
  if (!created) await row.update({ value, type });
}

/** Plain text only: no NUL / control characters except tab and new lines, Windows line ends unified. */
function clean(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/^﻿/, '')
    .trimEnd() + '\n';
}

class RobotsTxtController {
  // Public: the website's /robots.txt asks for the custom text (null = use the automatic one).
  async getPublic(req, res) {
    try {
      const { content, enabled } = await read();
      return successResponse(res, 'robots.txt', { content: enabled ? content : null });
    } catch (error) {
      logger.error(`robots.txt read failed: ${error.message}`);
      return successResponse(res, 'robots.txt', { content: null });
    }
  }

  async get(req, res) {
    try {
      return successResponse(res, 'robots.txt', await read());
    } catch (error) {
      return errorResponse(res, error.message, [], 500);
    }
  }

  // body: { content, enabled }. enabled false keeps the text but goes back to the automatic file.
  async update(req, res) {
    try {
      const enabled = req.body?.enabled !== false;
      const raw = req.body?.content;
      if (raw !== undefined) {
        if (typeof raw !== 'string') return errorResponse(res, 'robots.txt must be text', [{ field: 'content', message: 'Must be text' }], 422);
        if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return errorResponse(res, 'robots.txt is too large (max 64 KB)', [{ field: 'content', message: 'Max 64 KB' }], 422);
        if (enabled && !raw.trim()) return errorResponse(res, 'robots.txt is empty', [{ field: 'content', message: 'Add at least one rule' }], 422);
        await write(KEY, raw.trim() ? clean(raw) : '', 'text');
      }
      await write(ENABLED_KEY, enabled ? 'true' : 'false', 'boolean');
      return successResponse(res, enabled ? 'Custom robots.txt is live' : 'Automatic robots.txt is live', await read());
    } catch (error) {
      return errorResponse(res, error.message, [], 500);
    }
  }
}

module.exports = new RobotsTxtController();
