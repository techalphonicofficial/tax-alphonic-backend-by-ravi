'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Media extends Model {
    static associate(models) {
      Media.belongsTo(models.MediaFolder, { as: 'folder', foreignKey: 'folderId' });
      Media.belongsTo(models.MediaCategory, { as: 'category', foreignKey: 'categoryId' });
      Media.hasMany(models.MediaUsage, { as: 'usages', foreignKey: 'mediaId' });
      Media.hasMany(models.MediaAuditLog, { as: 'auditLogs', foreignKey: 'mediaId' });
    }
  }
  
  Media.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes',
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    altText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '{ width, height } for images/video',
    },
    // Where the file lives: 'local' (uploads/ folder) or a cloud provider key from
    // services/storage/providers.js (s3, r2, spaces, wasabi, b2, gcs, custom).
    storageType: {
      type: DataTypes.STRING(30),
      defaultValue: 'local',
    },
    // Object key / path inside that storage (e.g. uploads/logo-123.webp), used to delete it later.
    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_folders',
        key: 'id'
      }
    },
    // Set when the file went to the Trash with its folder (that folder's id); restoring the folder brings it back.
    trashedWithFolderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_categories',
        key: 'id'
      }
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'Media',
    tableName: 'media',
    paranoid: true, // Enables deletedAt for "Trash" feature
    timestamps: true,
  });
  
  return Media;
};
