'use strict';

// Optional icon of a menu item: an emoji or an image URL (Media library).
// The website header shows it next to the link in dropdowns (a default icon when empty).
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const table = await queryInterface.describeTable('menu_items');
        if (!table.icon) {
            await queryInterface.addColumn('menu_items', 'icon', { type: Sequelize.STRING(500), allowNull: true });
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('menu_items', 'icon');
    }
};
