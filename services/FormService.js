const { Op } = require('sequelize');
const BaseService = require('./BaseService');
const FormRepository = require('../repositories/FormRepository');
const InquiryRepository = require('../repositories/InquiryRepository');
const MailService = require('./MailService');
const { logger } = require('../config/logger');
const { Form, sequelize } = require('../models');
const { findSectionUsages } = require('../utils/sectionUsages');

const FIELD_TYPES = ['text', 'email', 'phone', 'number', 'textarea', 'select', 'radio', 'checkbox', 'date', 'hidden'];
const OPTION_TYPES = ['select', 'radio', 'checkbox'];
const MAP_TARGETS = ['name', 'email', 'phone', 'website', 'subject', 'message'];
const REQUIRED_MAP_TARGETS = ['name', 'email'];
const SORTABLE_COLUMNS = ['name', 'slug', 'status', 'createdAt', 'updatedAt'];

// Page Builder block type that embeds a form (see cms-admin PageBuilder AVAILABLE_BLOCKS)
const FORM_BLOCK_TYPE = 'Form';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s().]{6,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const REDIRECT_REGEX = /^(https?:\/\/|\/)/i;

class HttpError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const makeSlug = (str) => String(str || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

const isEmptyValue = (value) => value === undefined || value === null || value === '' ||
  (Array.isArray(value) && value.length === 0);

class FormService extends BaseService {
  constructor() {
    super(FormRepository);
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD
  // ---------------------------------------------------------------------------

  async getAll(reqQuery = {}) {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'DESC', search, status } = reqQuery;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);

    const where = {};
    if (search && String(search).trim()) {
      where.name = { [Op.like]: `%${String(search).trim()}%` };
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orderColumn = SORTABLE_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await this.repository.findAndCountAll({
      where,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [[orderColumn, orderDir]],
      attributes: {
        include: [[
          sequelize.literal('(SELECT COUNT(*) FROM `inquiries` AS `i` WHERE `i`.`formId` = `Form`.`id` AND `i`.`deletedAt` IS NULL)'),
          'submissionCount'
        ]]
      }
    });

    return {
      data: result.rows,
      pagination: {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limitNum),
        currentPage: pageNum,
        itemsPerPage: limitNum,
      }
    };
  }

  async getById(id) {
    const form = await this.repository.findById(id);
    if (!form) throw new HttpError('Form not found', 404);
    return form;
  }

  async getWithUsages(id) {
    const form = await this.getById(id);
    const usages = await this.findUsages(id);
    return { ...form.toJSON(), usages };
  }

  async create(data) {
    const clean = await this._prepareDefinition(data);
    return await this.repository.create(clean);
  }

  async update(id, data) {
    const form = await this.getById(id);
    const clean = await this._prepareDefinition({ ...form.toJSON(), ...data }, id);
    return await form.update(clean);
  }

  async duplicate(id) {
    const form = await this.getById(id);
    const source = form.toJSON();
    return await this.create({
      name: `${source.name} (Copy)`,
      description: source.description,
      fields: source.fields,
      settings: source.settings,
      status: 'inactive'
    });
  }

  async delete(id, { force = false } = {}) {
    const form = await this.getById(id);
    if (!force) {
      const usages = await this.findUsages(id);
      if (usages.length > 0) {
        const where = usages.map(u => `${u.type}: ${u.title}`).join(', ');
        throw new HttpError(`This form is attached to ${usages.length} item(s) (${where}). Remove it from them first, or delete with force=true.`, 409, usages);
      }
    }
    await form.destroy();
    return true;
  }

  // Every page, service and blog whose Page Builder sections reference this form
  async findUsages(formId) {
    return findSectionUsages(formId);
  }

  // ---------------------------------------------------------------------------
  // Public (website) API
  // ---------------------------------------------------------------------------

  async getPublic(identifier) {
    const form = await this.repository.findActiveByIdOrSlug(identifier);
    if (!form) throw new HttpError('Form not found', 404);
    return this.toPublic(form);
  }

  toPublic(form) {
    const { id, name, slug, description, fields, settings } = form.toJSON ? form.toJSON() : form;
    return {
      id,
      name,
      slug,
      description,
      fields: (fields || []).map(({ mapTo, ...field }) => field),
      settings: {
        submitButtonText: settings?.submitButtonText || 'Submit',
        successMessage: settings?.successMessage || 'Thank you! Your submission has been received.',
        redirectUrl: settings?.redirectUrl || ''
      }
    };
  }

  async submit(identifier, body = {}, meta = {}) {
    const form = await this.repository.findActiveByIdOrSlug(identifier);
    if (!form) throw new HttpError('Form not found or no longer accepting submissions', 404);

    const settings = form.settings || {};
    const response = {
      message: settings.successMessage || 'Thank you! Your submission has been received.',
      redirectUrl: settings.redirectUrl || ''
    };

    // Honeypot: bots fill every input, humans never see this one
    if (body._hp) {
      logger.warn(`Form honeypot triggered on ${form.slug} from ${meta.ipAddress}`);
      return response;
    }

    const fields = form.fields || [];
    const { values, errors } = this._validateSubmission(fields, body);
    if (errors.length > 0) {
      throw new HttpError('Please correct the highlighted fields.', 422, errors);
    }

    const mapped = {};
    fields.forEach(f => { if (f.mapTo) mapped[f.mapTo] = values[f.name]; });

    const formData = fields.map(f => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type,
      value: values[f.name] ?? ''
    }));

    const message = !isEmptyValue(mapped.message)
      ? String(mapped.message)
      : formData
        .filter(d => !fields.find(f => f.name === d.name)?.mapTo && d.type !== 'hidden' && !isEmptyValue(d.value))
        .map(d => `${d.label}: ${this._displayValue(d.value)}`)
        .join('\n');

    const lead = {
      name: String(mapped.name || '').slice(0, 150),
      email: String(mapped.email || '').toLowerCase(),
      phone: isEmptyValue(mapped.phone) ? null : String(mapped.phone),
      website: isEmptyValue(mapped.website) ? null : String(mapped.website).slice(0, 255),
      subject: (isEmptyValue(mapped.subject) ? form.name : String(mapped.subject)).slice(0, 255),
      message: message || null,
      source: (settings.source || `Form: ${form.name}`).slice(0, 150),
      status: 'NEW',
      priority: 'MEDIUM',
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      formId: form.id,
      formData
    };

    try {
      await InquiryRepository.create(lead);
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        throw new HttpError('Please correct the highlighted fields.', 422, error.errors.map(e => ({ field: e.path, message: e.message })));
      }
      throw error;
    }

    if (settings.sendEmailNotification !== false) {
      MailService.sendLeadNotification(lead).catch(err => logger.error(`Form lead email failed: ${err.message}`));
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // Page Builder integration: attach the public form definition to Form blocks
  // ---------------------------------------------------------------------------

  // sections: [{ type, data: { payload: { formId } } }]  (pages, blogs)
  // Form blocks, plus any other block that picks a form (e.g. the homepage's expert banner).
  async hydrateSections(sections) {
    if (!Array.isArray(sections)) return sections;
    const usesForm = (s) => s?.type === FORM_BLOCK_TYPE || Boolean(s?.data?.payload?.formId);
    const formsById = await this._loadForms(sections.filter(usesForm).map(s => s.data?.payload?.formId));
    if (!formsById) return sections;

    return sections.map(s => {
      if (!usesForm(s)) return s;
      const payload = s.data?.payload || {};
      return { ...s, data: { ...s.data, payload: { ...payload, form: formsById.get(payload.formId) || null } } };
    });
  }

  // service: plain object with sections: [{ type: { componentKey }, data: { payload } }]
  async hydrateServiceSections(service) {
    if (!service || !Array.isArray(service.sections)) return service;

    const sections = service.sections.map(sec => {
      if (sec?.data && typeof sec.data.payload === 'string') {
        try {
          return { ...sec, data: { ...sec.data, payload: JSON.parse(sec.data.payload) } };
        } catch (e) {
          return sec;
        }
      }
      return sec;
    });
    const isFormBlock = (sec) => sec?.type?.componentKey === FORM_BLOCK_TYPE;

    const formsById = await this._loadForms(sections.filter(isFormBlock).map(sec => sec.data?.payload?.formId));
    if (!formsById) return { ...service, sections };

    return {
      ...service,
      sections: sections.map(sec => {
        if (!isFormBlock(sec)) return sec;
        const payload = sec.data?.payload || {};
        return { ...sec, data: { ...sec.data, payload: { ...payload, form: formsById.get(payload.formId) || null } } };
      })
    };
  }

  async _loadForms(ids) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return null;
    const forms = await Form.findAll({ where: { id: uniqueIds, status: 'active' } });
    return new Map(forms.map(f => [f.id, this.toPublic(f)]));
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  async _prepareDefinition(data, excludeId = null) {
    const errors = [];
    const name = String(data.name || '').trim();
    if (!name) errors.push({ field: 'name', message: 'Form name is required' });

    const status = ['active', 'inactive'].includes(data.status) ? data.status : 'active';
    const settings = this._normalizeSettings(data.settings, errors);
    const fields = this._normalizeFields(data.fields, errors);

    if (errors.length > 0) throw new HttpError('Form validation failed', 422, errors);

    const slug = await this._resolveSlug(data.slug, name, excludeId);

    return {
      name,
      slug,
      description: data.description ? String(data.description).trim() : null,
      fields,
      settings,
      status
    };
  }

  async _resolveSlug(requestedSlug, name, excludeId) {
    const explicit = makeSlug(requestedSlug);
    if (explicit) {
      if (await this.repository.slugExists(explicit, excludeId)) {
        throw new HttpError(`Slug "${explicit}" is already used by another form`, 409, [{ field: 'slug', message: 'Slug already exists' }]);
      }
      return explicit;
    }

    const base = makeSlug(name) || 'form';
    let candidate = base;
    let counter = 2;
    while (await this.repository.slugExists(candidate, excludeId)) {
      candidate = `${base}-${counter++}`;
    }
    return candidate;
  }

  _normalizeSettings(raw, errors) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const redirectUrl = s.redirectUrl ? String(s.redirectUrl).trim() : '';
    if (redirectUrl && !REDIRECT_REGEX.test(redirectUrl)) {
      errors.push({ field: 'settings.redirectUrl', message: 'Redirect URL must start with http://, https:// or /' });
    }
    return {
      submitButtonText: String(s.submitButtonText || 'Submit').trim().slice(0, 100),
      successMessage: String(s.successMessage || 'Thank you! Your submission has been received.').trim(),
      redirectUrl,
      source: s.source ? String(s.source).trim().slice(0, 150) : '',
      sendEmailNotification: s.sendEmailNotification !== false
    };
  }

  _normalizeFields(rawFields, errors) {
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      errors.push({ field: 'fields', message: 'Add at least one field to the form' });
      return [];
    }

    const names = new Set();
    const mapped = {};

    const fields = rawFields.map((f, i) => {
      const field = f && typeof f === 'object' ? f : {};
      const type = field.type;
      const label = String(field.label || '').trim();
      const name = String(field.name || '').trim();
      const at = `Field #${i + 1}${label ? ` (${label})` : ''}`;
      const push = (key, message) => errors.push({ field: `fields[${i}].${key}`, message: `${at}: ${message}` });

      if (!FIELD_TYPES.includes(type)) push('type', `invalid type "${type}"`);
      if (!label && type !== 'hidden') push('label', 'label is required');
      if (!FIELD_NAME_REGEX.test(name)) {
        push('name', 'name must start with a letter and contain only letters, numbers and underscores');
      } else if (names.has(name)) {
        push('name', `duplicate field name "${name}"`);
      } else {
        names.add(name);
      }

      let options = [];
      if (OPTION_TYPES.includes(type)) {
        options = (Array.isArray(field.options) ? field.options : [])
          .map(o => ({
            label: String(o?.label ?? o?.value ?? '').trim(),
            value: String(o?.value ?? o?.label ?? '').trim()
          }))
          .filter(o => o.value !== '');
        if (type !== 'checkbox' && options.length === 0) push('options', 'add at least one option');
        if (new Set(options.map(o => o.value)).size !== options.length) push('options', 'option values must be unique');
      }

      const mapTo = MAP_TARGETS.includes(field.mapTo) ? field.mapTo : '';
      if (mapTo) {
        if (mapped[mapTo]) push('mapTo', `only one field can be mapped to "${mapTo}"`);
        else mapped[mapTo] = { type, required: Boolean(field.required), at };
      }

      const rawValidation = field.validation && typeof field.validation === 'object' ? field.validation : {};
      const validation = {};
      ['minLength', 'maxLength', 'min', 'max'].forEach(key => {
        if (isEmptyValue(rawValidation[key])) return;
        const num = Number(rawValidation[key]);
        if (Number.isFinite(num)) validation[key] = num;
        else push(`validation.${key}`, `${key} must be a number`);
      });
      if (rawValidation.pattern) {
        try {
          new RegExp(rawValidation.pattern);
          validation.pattern = String(rawValidation.pattern);
          if (rawValidation.patternMessage) validation.patternMessage = String(rawValidation.patternMessage);
        } catch (e) {
          push('validation.pattern', 'pattern is not a valid regular expression');
        }
      }

      return {
        id: field.id ? String(field.id) : `fld_${Date.now()}_${i}`,
        type,
        label,
        name,
        placeholder: field.placeholder ? String(field.placeholder) : '',
        helpText: field.helpText ? String(field.helpText) : '',
        required: Boolean(field.required),
        width: field.width === 'half' ? 'half' : 'full',
        options,
        defaultValue: isEmptyValue(field.defaultValue) ? '' : field.defaultValue,
        validation,
        mapTo
      };
    });

    // Every submission becomes a CRM lead, which needs a name and an email
    REQUIRED_MAP_TARGETS.forEach(target => {
      if (!mapped[target]) {
        errors.push({ field: 'fields', message: `Map one field to "${target}". Every submission is saved as a CRM lead, which needs a ${target}.` });
      } else if (!mapped[target].required) {
        errors.push({ field: 'fields', message: `${mapped[target].at}: is mapped to "${target}", so it must be required` });
      }
    });
    if (mapped.email && mapped.email.type !== 'email') {
      errors.push({ field: 'fields', message: `${mapped.email.at}: the field mapped to "email" must be of type Email` });
    }

    return fields;
  }

  _validateSubmission(fields, body) {
    const values = {};
    const errors = [];

    fields.forEach(f => {
      const label = f.label || f.name;
      const fail = (message) => errors.push({ field: f.name, message });
      let raw = body[f.name];
      if (f.type === 'hidden' && isEmptyValue(raw)) raw = f.defaultValue;

      // Multi-choice checkbox group
      if (f.type === 'checkbox' && f.options?.length) {
        const list = isEmptyValue(raw) ? [] : (Array.isArray(raw) ? raw : [raw]).map(String);
        const allowed = new Set(f.options.map(o => o.value));
        if (list.some(v => !allowed.has(v))) fail(`${label} contains an invalid option`);
        else if (f.required && list.length === 0) fail(`${label} is required`);
        values[f.name] = list;
        return;
      }

      // Single consent-style checkbox
      if (f.type === 'checkbox') {
        const checked = raw === true || raw === 1 || ['true', 'on', '1', 'yes'].includes(String(raw).toLowerCase());
        if (f.required && !checked) fail(`${label} must be checked`);
        values[f.name] = checked;
        return;
      }

      if (raw !== null && typeof raw === 'object') {
        fail(`${label} has an invalid value`);
        return;
      }

      let value = isEmptyValue(raw) ? '' : String(raw).trim();
      if (value === '') {
        if (f.required) fail(`${label} is required`);
        values[f.name] = '';
        return;
      }

      const v = f.validation || {};
      switch (f.type) {
        case 'email':
          value = value.toLowerCase();
          if (!EMAIL_REGEX.test(value)) return fail(`${label} must be a valid email address`);
          break;
        case 'phone':
          if (!PHONE_REGEX.test(value)) return fail(`${label} must be a valid phone number`);
          break;
        case 'number': {
          const num = Number(value);
          if (!Number.isFinite(num)) return fail(`${label} must be a number`);
          if (v.min !== undefined && num < v.min) return fail(`${label} must be at least ${v.min}`);
          if (v.max !== undefined && num > v.max) return fail(`${label} must be at most ${v.max}`);
          values[f.name] = num;
          return;
        }
        case 'date':
          if (!DATE_REGEX.test(value) || Number.isNaN(Date.parse(value))) return fail(`${label} must be a valid date (YYYY-MM-DD)`);
          break;
        case 'select':
        case 'radio':
          if (!f.options?.some(o => o.value === value)) return fail(`${label} contains an invalid option`);
          break;
        default:
          break;
      }

      const maxLength = v.maxLength ?? (f.type === 'textarea' ? 5000 : 500);
      if (value.length > maxLength) return fail(`${label} must be at most ${maxLength} characters`);
      if (v.minLength !== undefined && value.length < v.minLength) return fail(`${label} must be at least ${v.minLength} characters`);
      if (v.pattern && !new RegExp(v.pattern).test(value)) return fail(v.patternMessage || `${label} format is invalid`);

      values[f.name] = value;
    });

    return { values, errors };
  }

  _displayValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
}

module.exports = new FormService();
