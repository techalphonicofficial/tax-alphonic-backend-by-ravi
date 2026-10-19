'use strict';

// Menus and SEO Configs move to the Trash (admin: /trash) instead of being deleted at once:
// they get a deletedAt column and the models become paranoid.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of ['menus', 'seos']) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.deletedAt) {
        await queryInterface.addColumn(table, 'deletedAt', { type: Sequelize.DATE, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    for (const table of ['menus', 'seos']) {
      await queryInterface.removeColumn(table, 'deletedAt');
    }
  }
};
