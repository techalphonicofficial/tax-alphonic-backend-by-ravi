'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MediaCategory extends Model {
    static associate(models) {
      MediaCategory.hasMany(models.Media, { as: 'files', foreignKey: 'categoryId' });
    }
  }

  MediaCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'MediaCategory',
    tableName: 'media_categories',
    timestamps: true,
  });

  return MediaCategory;
};
