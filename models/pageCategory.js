'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PageCategory extends Model {
    static associate(models) {
      // Define association if pages module exists (e.g., PageCategory.hasMany(models.Page, { foreignKey: 'categoryId' }))
    }
  }

  PageCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    }
  }, {
    sequelize,
    modelName: 'PageCategory',
    tableName: 'page_categories',
    timestamps: true,
    hooks: {
      beforeValidate: (category) => {
        if (category.name && !category.slug) {
          category.slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
      }
    }
  });

  return PageCategory;
};
