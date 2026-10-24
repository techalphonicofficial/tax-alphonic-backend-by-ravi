'use strict';
const { v4: uuidv4 } = require('uuid');

/*
 * 1. Every permission the code checks (routes' checkPermission / requirePermission / publicRead and
 *    the admin's RoutePermission / menu) exists in `permissions` (missing ones are added).
 * 2. The Admin role is linked to every permission (it already passes every check by name; this
 *    makes Roles → Admin show all of them ticked).
 * 3. A "CRM Manager" role: CRM leads / inquiries in full, Forms read (which form a lead came
 *    from) and Dashboard read.
 * Additive and idempotent: nothing existing is changed or removed.
 */

const CATALOGUE = {
  AboutPage: ['create', 'delete', 'read', 'update'],
  AuditLogs: ['create', 'delete', 'read', 'update'],
  Banners: ['create', 'delete', 'read', 'update'],
  BlogAuthors: ['create', 'delete', 'read', 'update'],
  BlogCategories: ['create', 'delete', 'read', 'update'],
  BlogTags: ['create', 'delete', 'read', 'update'],
  Blogs: ['create', 'delete', 'read', 'update'],
  Branches: ['create', 'delete', 'read', 'update'],
  CMS: ['create', 'delete', 'read', 'update'],
  CRM: ['create', 'delete', 'read', 'update'],
  Countries: ['create', 'delete', 'read', 'update'],
  Dashboard: ['read'],
  FAQs: ['create', 'delete', 'read', 'update'],
  Forms: ['create', 'delete', 'read', 'update'],
  Industries: ['create', 'delete', 'read', 'update'],
  Inquiries: ['create', 'delete', 'read', 'update'],
  LandingPages: ['archive', 'create', 'preview', 'publish', 'read', 'unpublish', 'update'],
  Locations: ['create', 'delete', 'read', 'update'],
  Media: ['create', 'delete', 'read', 'update'],
  Menus: ['create', 'delete', 'read', 'update'],
  Packages: ['create', 'delete', 'read', 'update'],
  PageCategories: ['create', 'delete', 'read', 'update'],
  Pages: ['create', 'delete', 'read', 'update'],
  Partners: ['create', 'delete', 'read', 'update'],
  Permissions: ['create', 'delete', 'read', 'update'],
  Portfolio: ['create', 'delete', 'read', 'update'],
  PortfolioCategories: ['create', 'delete', 'read', 'update'],
  PortfolioItems: ['create', 'delete', 'read', 'update'],
  Problems: ['create', 'delete', 'read', 'update'],
  Roles: ['create', 'delete', 'read', 'update'],
  SEO: ['create', 'delete', 'read', 'update'],
  SEOConfigs: ['create', 'delete', 'read', 'update'],
  SEOPages: ['create', 'delete', 'read', 'update'],
  ServiceCategories: ['create', 'delete', 'read', 'update'],
  Services: ['create', 'delete', 'read', 'update'],
  Settings: ['create', 'delete', 'read', 'update'],
  States: ['create', 'delete', 'read', 'update'],
  SystemLogs: ['delete', 'read'],
  TeamMembers: ['create', 'delete', 'read', 'update'],
  Technologies: ['create', 'delete', 'read', 'update'],
  Testimonials: ['create', 'delete', 'read', 'update'],
  Users: ['create', 'delete', 'read', 'update'],
};

const CRM_ROLE = 'CRM Manager';
const CRM_ROLE_DESCRIPTION = 'Manages CRM leads / inquiries: view, update status and notes, assign, delete. Sees which form a lead came from.';
const CRM_PERMISSIONS = {
  CRM: ['create', 'delete', 'read', 'update'],
  Inquiries: ['create', 'delete', 'read', 'update'],
  Forms: ['read'],
  Dashboard: ['read'],
};

const VERB = { create: 'Create', read: 'View', update: 'Edit', delete: 'Delete', archive: 'Archive', preview: 'Preview', publish: 'Publish', unpublish: 'Unpublish' };

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements = []) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    const now = new Date();

    // 1. Missing permissions
    const existing = await q('SELECT id, module, action FROM permissions');
    const key = (m, a) => `${m}|${a}`;
    const ids = new Map(existing.map((p) => [key(p.module, p.action), p.id]));
    const newPerms = [];
    Object.entries(CATALOGUE).forEach(([module, actions]) => actions.forEach((action) => {
      if (ids.has(key(module, action))) return;
      const id = uuidv4();
      ids.set(key(module, action), id);
      newPerms.push({ id, module, action, description: `${VERB[action] || action} ${module}`, createdAt: now, updatedAt: now });
    }));
    if (newPerms.length) await queryInterface.bulkInsert('permissions', newPerms);

    const link = async (roleId, permissionIds) => {
      const have = new Set((await q('SELECT permissionId FROM rolepermissions WHERE roleId = ?', [roleId])).map((r) => r.permissionId));
      const rows = [...new Set(permissionIds)].filter((id) => !have.has(id)).map((permissionId) => ({ roleId, permissionId, createdAt: now, updatedAt: now }));
      if (rows.length) await queryInterface.bulkInsert('rolepermissions', rows);
    };

    // 2. Admin: every permission in the catalogue
    const [admin] = await q("SELECT id FROM roles WHERE name = 'Admin' LIMIT 1");
    if (admin) {
      const all = Object.entries(CATALOGUE).flatMap(([module, actions]) => actions.map((action) => ids.get(key(module, action))));
      await link(admin.id, all);
    }

    // 3. CRM Manager (a soft-deleted role of that name is brought back)
    let [crm] = await q('SELECT id, deletedAt FROM roles WHERE name = ? LIMIT 1', [CRM_ROLE]);
    if (!crm) {
      crm = { id: uuidv4() };
      await queryInterface.bulkInsert('roles', [{ id: crm.id, name: CRM_ROLE, description: CRM_ROLE_DESCRIPTION, isActive: true, createdAt: now, updatedAt: now }]);
    } else if (crm.deletedAt) {
      await q('UPDATE roles SET deletedAt = NULL, isActive = 1, updatedAt = ? WHERE id = ?', [now, crm.id]);
    }
    const crmIds = Object.entries(CRM_PERMISSIONS).flatMap(([module, actions]) => actions.map((action) => ids.get(key(module, action))));
    await link(crm.id, crmIds);
  },

  down: async (queryInterface) => {
    // Removes the CRM Manager role (when no user has it) and its links. Admin keeps its links and
    // added permission rows stay: removing them could take away grants made in the admin since.
    const q = (sql, replacements = []) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    const [crm] = await q('SELECT id FROM roles WHERE name = ? LIMIT 1', [CRM_ROLE]);
    if (!crm) return;
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM users WHERE roleId = ? AND deletedAt IS NULL', [crm.id]);
    if (Number(n) > 0) throw new Error(`${n} user(s) still have the ${CRM_ROLE} role: give them another role first.`);
    await q('DELETE FROM rolepermissions WHERE roleId = ?', [crm.id]);
    await q('DELETE FROM roles WHERE id = ?', [crm.id]);
  },
};
