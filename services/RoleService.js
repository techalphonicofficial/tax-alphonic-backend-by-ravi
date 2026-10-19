const RoleRepository = require('../repositories/RoleRepository');
const BaseService = require('./BaseService');
const AuditLogService = require('./AuditLogService');
const { moduleLabel } = require('../utils/auditDescribe');

class RoleService extends BaseService {
  constructor() {
    super(RoleRepository);
  }

  async findByName(name) {
    return await this.repository.findByName(name);
  }

  async assignPermissions(roleId, permissionIds) {
    const role = await this.repository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    const before = await this.repository.findByIdWithPermissions(roleId);
    await role.setPermissions(permissionIds);
    const after = await this.repository.findByIdWithPermissions(roleId);
    await this._auditPermissionChanges(after || role, before?.permissions || [], after?.permissions || []);
    return after;
  }

  async _auditPermissionChanges(role, oldPermissions, newPermissions) {
    const label = (p) => `${p.module}:${p.action}`;
    const oldLabels = oldPermissions.map(label);
    const newLabels = newPermissions.map(label);
    const granted = newLabels.filter(l => !oldLabels.includes(l));
    const revoked = oldLabels.filter(l => !newLabels.includes(l));
    if (granted.length === 0 && revoked.length === 0) return;

    const parts = [];
    if (granted.length) parts.push(`granted ${granted.join(', ')}`);
    if (revoked.length) parts.push(`revoked ${revoked.join(', ')}`);
    await AuditLogService.record({
      action: 'UPDATE',
      module: moduleLabel('Role'),
      recordId: role.id,
      description: `Changed permissions of role "${role.name}": ${parts.join('; ')}`,
      oldData: { permissions: oldLabels },
      newData: { permissions: newLabels }
    });
  }
}

module.exports = new RoleService();
