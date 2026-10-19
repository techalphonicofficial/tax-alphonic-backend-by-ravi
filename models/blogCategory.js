'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogCategory extends Model {
    static associate(models) {
      BlogCategory.hasMany(models.Blog, {
        foreignKey: 'categoryId',
        as: 'blogs'
      });
      BlogCategory.belongsTo(models.BlogCategory, {
        foreignKey: 'parentId',
        as: 'parent'
      });
      BlogCategory.hasMany(models.BlogCategory, {
        foreignKey: 'parentId',
        as: 'children'
      });
    }
  }
  BlogCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'blog_categories',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published'
    }
  }, {
    sequelize,
    modelName: 'BlogCategory',
    tableName: 'blog_categories',
    timestamps: true,
  });
  return BlogCategory;
};
