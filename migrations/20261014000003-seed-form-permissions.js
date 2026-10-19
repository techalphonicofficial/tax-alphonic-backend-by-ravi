'use strict';
const { v4: uuidv4 } = require('uuid');

const ACTIONS = ['create', 'read', 'update', 'delete'];

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const [existing] = await queryInterface.sequelize.query(
            "SELECT action FROM permissions WHERE module = 'Forms'"
        );
        const existingActions = existing.map(p => p.action);
        const now = new Date();

        const rows = ACTIONS
            .filter(action => !existingActions.includes(action))
            .map(action => ({
                id: uuidv4(),
                module: 'Forms',
                action,
                description: `${action.charAt(0).toUpperCase() + action.slice(1)} Forms`,
                createdAt: now,
                updatedAt: now
            }));

        if (rows.length > 0) {
            await queryInterface.bulkInsert('permissions', rows);
        }
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('permissions', { module: 'Forms' });
    }
};
