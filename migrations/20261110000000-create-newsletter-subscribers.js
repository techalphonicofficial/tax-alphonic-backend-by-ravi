'use strict';

// Website newsletter sign-ups (Newsletter block → POST /newsletter/subscribe), listed in the admin
// under Newsletter Subscribers. One row per email address.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tables.includes('newsletter_subscribers')) return;
    await queryInterface.createTable('newsletter_subscribers', {
      id: { type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin', allowNull: false, primaryKey: true },
      email: { type: Sequelize.STRING(190), allowNull: false },
      name: { type: Sequelize.STRING(120), allowNull: true },
      status: { type: Sequelize.ENUM('subscribed', 'unsubscribed'), allowNull: false, defaultValue: 'subscribed' },
      source: { type: Sequelize.STRING(255), allowNull: true },
      ipAddress: { type: Sequelize.STRING(64), allowNull: true },
      subscribedAt: { type: Sequelize.DATE, allowNull: true },
      unsubscribedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('newsletter_subscribers', ['email'], { unique: true, name: 'newsletter_subscribers_email' });
    await queryInterface.addIndex('newsletter_subscribers', ['status', 'createdAt'], { name: 'newsletter_subscribers_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('newsletter_subscribers');
  },
};
