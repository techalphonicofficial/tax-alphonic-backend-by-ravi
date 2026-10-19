'use strict';
const { v4: uuidv4 } = require('uuid');

// SystemLogs: read = view/download general & error logs, delete = clear a log file
const ACTIONS = ['read', 'delete'];

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const [existing] = await queryInterface.sequelize.query(
            "SELECT action FROM permissions WHERE module = 'SystemLogs'"
        );
        const existingActions = existing.map(p => p.action);
        const now = new Date();

        const rows = ACTIONS
            .filter(action => !existingActions.includes(action))
            .map(action => ({
                id: uuidv4(),
                module: 'SystemLogs',
                action,
                description: action === 'read' ? 'View and download system logs' : 'Clear system log files',
                createdAt: now,
                updatedAt: now
            }));

        if (rows.length > 0) {
            await queryInterface.bulkInsert('permissions', rows);
        }
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('permissions', { module: 'SystemLogs' });
    }
};
