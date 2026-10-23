'use strict';
const { v4: uuidv4 } = require('uuid');

// Permissions of the Landing Pages module (admin: Roles → LandingPages). The Admin role
// passes every check already; other roles get none until they are ticked in the role.
const MODULE = 'LandingPages';
const ACTIONS = {
  read: 'View landing pages',
  create: 'Create landing pages',
  update: 'Edit landing page settings and save drafts',
  preview: 'Preview landing page drafts',
  publish: 'Publish landing pages',
  unpublish: 'Unpublish landing pages',
  archive: 'Archive and restore landing pages',
};

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await queryInterface.sequelize.query('SELECT action FROM permissions WHERE module = ?', { replacements: [MODULE] });
    const have = new Set(existing.map((p) => p.action));
    const now = new Date();
    const rows = Object.entries(ACTIONS)
      .filter(([action]) => !have.has(action))
      .map(([action, description]) => ({ id: uuidv4(), module: MODULE, action, description, createdAt: now, updatedAt: now }));
    if (rows.length) await queryInterface.bulkInsert('permissions', rows);
  },

  down: async (queryInterface) => {
    // Role links first (rolepermissions has no cascade on every install).
    await queryInterface.sequelize.query(
      'DELETE FROM rolepermissions WHERE permissionId IN (SELECT id FROM permissions WHERE module = ?)',
      { replacements: [MODULE] }
    );
    await queryInterface.bulkDelete('permissions', { module: MODULE });
  },
};
