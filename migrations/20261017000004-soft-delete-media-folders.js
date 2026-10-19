'use strict';

// Deleting a Media folder moves it to the Trash with everything inside it instead of deleting it:
// - media_folders gets deletedAt (the model becomes paranoid).
// - media_folders and media get trashedWithFolderId: the id of the folder whose delete took them
//   to the Trash, so restoring that folder brings back exactly its subfolders and files.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const folders = await queryInterface.describeTable('media_folders');
    if (!folders.deletedAt) {
      await queryInterface.addColumn('media_folders', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    }
    for (const table of ['media_folders', 'media']) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.trashedWithFolderId) {
        await queryInterface.addColumn(table, 'trashedWithFolderId', { type: Sequelize.UUID, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('media', 'trashedWithFolderId');
    await queryInterface.removeColumn('media_folders', 'trashedWithFolderId');
    await queryInterface.removeColumn('media_folders', 'deletedAt');
  }
};
