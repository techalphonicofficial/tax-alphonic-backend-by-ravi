'use strict';

// Media storage: where uploads go is chosen in the admin (Media → Media Settings) instead of .env.
// - storage_settings: one row; activeProvider ('local' = this project's uploads/ folder, the
//   default) and per-provider settings as JSON (secrets AES-encrypted, see utils/secretBox.js).
// - media.storageType becomes a free string (local, s3, r2, spaces, wasabi, b2, gcs, custom)
//   and media.storageKey keeps the object key, so a file can be deleted later even after the
//   active provider changed.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.map((t) => (typeof t === 'string' ? t : t.tableName)).includes('storage_settings')) {
      await queryInterface.createTable('storage_settings', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
        activeProvider: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'local' },
        providers: { type: Sequelize.TEXT('long'), allowNull: true },
        lastTest: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
    }

    const media = await queryInterface.describeTable('media');
    await queryInterface.changeColumn('media', 'storageType', { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'local' });
    if (!media.storageKey) {
      await queryInterface.addColumn('media', 'storageKey', { type: Sequelize.STRING(500), allowNull: true });
    }
    // Existing files are local: /uploads/<file> → key uploads/<file>
    await queryInterface.sequelize.query(
      "UPDATE media SET storageKey = TRIM(LEADING '/' FROM url) WHERE storageKey IS NULL AND storageType = 'local' AND url LIKE '/uploads/%'"
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('media', 'storageKey');
    await queryInterface.changeColumn('media', 'storageType', { type: Sequelize.ENUM('local', 's3'), allowNull: false, defaultValue: 'local' });
    await queryInterface.dropTable('storage_settings');
  }
};
