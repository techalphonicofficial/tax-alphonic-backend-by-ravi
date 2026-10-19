'use strict';

// AI provider/model and content generation settings, editable from the admin panel.
// Kept out of the `settings` table on purpose: its routes have no auth and it would
// expose the API keys. Keys are stored AES-256-GCM encrypted (utils/secretBox.js).
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('ai_settings', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            scope: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            activeProvider: { type: Sequelize.STRING(30), allowNull: true },
            providers: { type: Sequelize.TEXT, allowNull: true },
            generation: { type: Sequelize.TEXT, allowNull: true },
            sections: { type: Sequelize.TEXT('long'), allowNull: true },
            wordCountTiers: { type: Sequelize.TEXT, allowNull: true },
            toneOptions: { type: Sequelize.TEXT, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('ai_settings');
    }
};
