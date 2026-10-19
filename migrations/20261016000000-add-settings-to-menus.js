'use strict';

// Per-menu display options (JSON). The footer menu keeps what the website footer shows
// around its links: logo, intro text, button, hiring strip, contact, social and copyright.
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const table = await queryInterface.describeTable('menus');
        if (!table.settings) {
            await queryInterface.addColumn('menus', 'settings', { type: Sequelize.TEXT, allowNull: true });
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('menus', 'settings');
    }
};
