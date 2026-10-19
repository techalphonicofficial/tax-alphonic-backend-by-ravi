'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MediaFolder extends Model {
    static associate(models) {
      MediaFolder.hasMany(models.MediaFolder, { as: 'children', foreignKey: 'parentId' });
      MediaFolder.belongsTo(models.MediaFolder, { as: 'parent', foreignKey: 'parentId' });
      MediaFolder.hasMany(models.Media, { as: 'files', foreignKey: 'folderId' });
    }
  }

  MediaFolder.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_folders',
        key: 'id'
      }
    },
    // Set when this folder went to the Trash inside a parent folder (that parent's id).
    trashedWithFolderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Role-based access permissions',
    }
  }, {
    sequelize,
    modelName: 'MediaFolder',
    tableName: 'media_folders',
    timestamps: true,
    paranoid: true, // Deleting a folder moves it (and what is inside) to the Trash
  });

  return MediaFolder;
};
