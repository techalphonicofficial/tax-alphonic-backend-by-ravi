const { logger } = require('../config/logger');
const {
  moduleLabel,
  recordNoun,
  recordLabel,
  redact,
  parseMaybeJson,
  describeChangedFields,
} = require('./auditDescribe');

// Models whose changes are not "website changes", or that are audited explicitly
// at a higher level (sections, menu items, role permissions, settings groups).
const EXCLUDED_MODELS = new Set([
  'AuditLog', 'LoginActivity', 'PasswordResetToken', 'MediaAuditLog', 'MediaUsage',
  'ServiceSection', 'ServiceSectionData', 'SectionType', 'MenuItem', 'RolePermission',
  'Setting', 'BlogFaq', 'AiSetting', 'BlogLike',
  // Published snapshots: the publish itself is logged as a Landing Page update.
  'LandingPageVersion',
]);

// Public form/contact submissions create Inquiries: CRM data, not a site change
const SKIP_CREATE = new Set(['Inquiry', 'BlogComment']);

// Bookkeeping columns that never make an update worth auditing on their own
const IGNORED_FIELDS = new Set([
  'createdAt', 'updatedAt', 'deletedAt', 'lastLoginAt', 'refreshToken', 'viewCount', 'likeCount', 'shareCount',
]);

const NUMERIC_TYPES = new Set(['DECIMAL', 'FLOAT', 'DOUBLE', 'REAL', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT']);

const isAudited = (model) => Boolean(model) && !EXCLUDED_MODELS.has(model.name);

// MariaDB hands JSON back as strings and DECIMAL as strings; normalise both
// sides before comparing so untouched values are not reported as changed.
const normalize = (model, field, value) => {
  const type = model.rawAttributes[field]?.type?.key;
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (type === 'JSON') return JSON.stringify(parseMaybeJson(value));
  if (type === 'DATE' || type === 'DATEONLY') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
  if (NUMERIC_TYPES.has(type)) return value === '' ? null : Number(value);
  if (type === 'BOOLEAN') return value === true || value === 1 || value === '1' || value === 'true';
  return value;
};

const readable = (model, field, value) => {
  const type = model.rawAttributes[field]?.type?.key;
  return type === 'JSON' ? parseMaybeJson(value) : value;
};

const snapshot = (instance) => redact(instance.get({ plain: true }));

const record = (entry) => {
  // Lazy require: this module is loaded while models/index.js is still building
  const AuditLogService = require('../services/AuditLogService');
  return AuditLogService.record(entry);
};

const quote = (label) => (label ? ` "${label}"` : '');

module.exports = (sequelize) => {
  // Bulk Model.update/destroy/restore only fire bulk hooks; switch audited
  // models to per-row hooks so each affected record gets its own entry.
  const forceIndividualHooks = (options) => {
    if (isAudited(options.model)) options.individualHooks = true;
  };
  sequelize.addHook('beforeBulkUpdate', forceIndividualHooks);
  sequelize.addHook('beforeBulkDestroy', forceIndividualHooks);
  sequelize.addHook('beforeBulkRestore', forceIndividualHooks);

  sequelize.addHook('afterCreate', async (instance, options) => {
    const model = instance.constructor;
    if (!isAudited(model) || SKIP_CREATE.has(model.name)) return;
    const data = snapshot(instance);
    await record({
      action: 'CREATE',
      module: moduleLabel(model.name),
      recordId: instance.id,
      description: `Created ${recordNoun(model.name)}${quote(recordLabel(data))}`,
      newData: data,
      transaction: options.transaction,
    });
  });

  // Capture the diff before the row is written; previous values are reset after save
  sequelize.addHook('beforeUpdate', (instance) => {
    const model = instance.constructor;
    instance._auditChanges = null;
    if (!isAudited(model)) return;

    const fields = (instance.changed() || [])
      .filter(field => !IGNORED_FIELDS.has(field) && model.rawAttributes[field])
      .filter(field => JSON.stringify(normalize(model, field, instance.previous(field))) !==
        JSON.stringify(normalize(model, field, instance.getDataValue(field))));
    if (fields.length === 0) return;

    const oldData = {};
    const newData = {};
    fields.forEach(field => {
      oldData[field] = readable(model, field, instance.previous(field));
      newData[field] = readable(model, field, instance.getDataValue(field));
    });
    instance._auditChanges = { fields, oldData: redact(oldData), newData: redact(newData) };
  });

  sequelize.addHook('afterUpdate', async (instance, options) => {
    const model = instance.constructor;
    const changes = instance._auditChanges;
    instance._auditChanges = null;
    if (!isAudited(model) || !changes) return;

    try {
      const label = recordLabel({ ...changes.oldData, ...instance.get({ plain: true }) });
      await record({
        action: 'UPDATE',
        module: moduleLabel(model.name),
        recordId: instance.id,
        description: `Updated ${recordNoun(model.name)}${quote(label)}: ${describeChangedFields(model.name, changes.fields, changes.oldData, changes.newData)}`,
        oldData: changes.oldData,
        newData: changes.newData,
        transaction: options.transaction,
      });
    } catch (error) {
      logger.error(`Audit update hook failed for ${model.name} ${instance.id}: ${error.message}`);
    }
  });

  sequelize.addHook('afterDestroy', async (instance, options) => {
    const model = instance.constructor;
    if (!isAudited(model)) return;
    const data = snapshot(instance);
    const permanent = options.force || !model.options.paranoid;
    await record({
      action: 'DELETE',
      module: moduleLabel(model.name),
      recordId: instance.id,
      description: `Deleted ${recordNoun(model.name)}${quote(recordLabel(data))}${permanent ? ' permanently' : ' (moved to trash)'}`,
      oldData: data,
      transaction: options.transaction,
    });
  });

  sequelize.addHook('afterRestore', async (instance, options) => {
    const model = instance.constructor;
    if (!isAudited(model)) return;
    const data = snapshot(instance);
    await record({
      action: 'RESTORE',
      module: moduleLabel(model.name),
      recordId: instance.id,
      description: `Restored ${recordNoun(model.name)}${quote(recordLabel(data))} from trash`,
      newData: data,
      transaction: options.transaction,
    });
  });
};
