'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MediaUsage extends Model {
    static associate(models) {
      MediaUsage.belongsTo(models.Media, { as: 'media', foreignKey: 'mediaId' });
    }
  }

  MediaUsage.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mediaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'media',
        key: 'id'
      }
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., Page, Banner, Product'
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Which field on the entity uses this media, e.g., heroImage'
    }
  }, {
    sequelize,
    modelName: 'MediaUsage',
    tableName: 'media_usages',
    timestamps: true,
  });

  return MediaUsage;
};
