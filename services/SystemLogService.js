const fs = require('fs');
const { LOG_FILES, SEPARATOR, NEWLINE_MARKER } = require('../config/logger');
const AuditLogService = require('./AuditLogService');

const COLUMNS = ['timestamp', 'level', 'requestId', 'method', 'url', 'status', 'duration', 'ip', 'user'];
const blank = (value) => (value === '-' ? null : value);

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class SystemLogService {
  resolveFile(type) {
    const file = LOG_FILES[type];
    if (!file) throw new HttpError(`Unknown log type "${type}". Use one of: ${Object.keys(LOG_FILES).join(', ')}`, 400);
    return file;
  }

  // "timestamp | LEVEL | requestId | method | url | status | duration | ip | user | message"
  parseLine(line, index) {
    const parts = line.split(SEPARATOR);
    if (parts.length <= COLUMNS.length) {
      // Line written in another format (e.g. before this logger existed)
      return { id: index, timestamp: null, level: 'INFO', message: line };
    }
    const entry = { id: index };
    COLUMNS.forEach((column, i) => { entry[column] = blank(parts[i]); });
    entry.status = entry.status ? Number(entry.status) || entry.status : null;
    entry.message = parts.slice(COLUMNS.length).join(SEPARATOR).split(NEWLINE_MARKER).join('\n');
    return entry;
  }

  async getEntries(type, query = {}) {
    const file = this.resolveFile(type);
    const { page = 1, limit = 50, level, method, status, search, from, to } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 500);

    let content = '';
    let size = 0;
    try {
      content = await fs.promises.readFile(file, 'utf8');
      size = Buffer.byteLength(content);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Newest first
    const all = content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, i) => this.parseLine(line, i))
      .reverse();

    const summary = { total: all.length, INFO: 0, WARN: 0, ERROR: 0 };
    all.forEach(e => { if (summary[e.level] !== undefined) summary[e.level] += 1; });

    const term = search ? String(search).trim().toLowerCase() : '';
    const fromTs = from ? `${from} 00:00:00` : null;
    const toTs = to ? `${to} 23:59:59` : null;

    const filtered = all.filter(e => {
      if (level && level !== 'ALL' && e.level !== String(level).toUpperCase()) return false;
      if (method && method !== 'ALL' && e.method !== String(method).toUpperCase()) return false;
      if (status && status !== 'ALL') {
        const s = String(status);
        if (/^[1-5]xx$/i.test(s)) {
          if (!e.status || String(e.status)[0] !== s[0]) return false;
        } else if (String(e.status) !== s) {
          return false;
        }
      }
      if (fromTs && (!e.timestamp || e.timestamp < fromTs)) return false;
      if (toTs && (!e.timestamp || e.timestamp > toTs)) return false;
      if (term) {
        const haystack = [e.message, e.url, e.user, e.ip, e.requestId].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return {
      data: filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      pagination: {
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
        currentPage: pageNum,
        itemsPerPage: limitNum,
      },
      summary: { ...summary, fileSizeBytes: size }
    };
  }

  async clear(type) {
    const file = this.resolveFile(type);
    try {
      await fs.promises.truncate(file, 0);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await AuditLogService.record({
      action: 'CLEAR',
      module: 'System Logs',
      recordId: type,
      description: `Cleared the ${type} log file`
    });
  }
}

module.exports = new SystemLogService();
