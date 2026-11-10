'use strict';
const { v4: uuidv4 } = require('uuid');

// Permissions of the Newsletter module (admin: Roles → Newsletter). The Admin role passes every
// check already; other roles get none until they are ticked in the role.
const MODULE = 'Newsletter';
const ACTIONS = {
  read: 'View and export newsletter subscribers',
  update: 'Mark newsletter subscribers subscribed / unsubscribed',
  delete: 'Delete newsletter subscribers',
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
    await queryInterface.sequelize.query(
      'DELETE FROM rolepermissions WHERE permissionId IN (SELECT id FROM permissions WHERE module = ?)',
      { replacements: [MODULE] }
    );
    await queryInterface.bulkDelete('permissions', { module: MODULE });
  },
};
