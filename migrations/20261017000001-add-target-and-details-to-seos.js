'use strict';

// SEO Configs: an override for one website page, chosen in the admin instead of typed as a URL.
// targetType: service | page | seo_page (pSEO) | static (home, about) | custom (a typed URL);
// targetId: the record's id (or "home" / "about"). The website asks for the config of the record
// it renders; fields left empty keep the record's own SEO.
// Rows without a targetType (created before this) are ignored by the website until re-saved.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('seos');
    const add = async (name, spec) => {
      if (!table[name]) await queryInterface.addColumn('seos', name, spec);
    };
    await add('targetType', { type: Sequelize.STRING(20), allowNull: true });
    await add('targetId', { type: Sequelize.STRING(64), allowNull: true });
    await add('targetLabel', { type: Sequelize.STRING(255), allowNull: true });
    await add('robots', { type: Sequelize.STRING(50), allowNull: true });
    await add('ogTitle', { type: Sequelize.STRING(255), allowNull: true });
    await add('ogDescription', { type: Sequelize.TEXT, allowNull: true });
    await add('twitterCard', { type: Sequelize.STRING(30), allowNull: true });
    await add('schemaMarkup', { type: Sequelize.TEXT('long'), allowNull: true });

    const indexes = await queryInterface.showIndex('seos');
    if (!indexes.some((index) => index.name === 'seos_target')) {
      await queryInterface.addIndex('seos', ['targetType', 'targetId'], { name: 'seos_target' });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('seos', 'seos_target');
    for (const name of ['targetType', 'targetId', 'targetLabel', 'robots', 'ogTitle', 'ogDescription', 'twitterCard', 'schemaMarkup']) {
      await queryInterface.removeColumn('seos', name);
    }
  }
};
