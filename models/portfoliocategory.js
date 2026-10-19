'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PortfolioCategory extends Model {
    static associate(models) {
      PortfolioCategory.hasMany(models.PortfolioItem, {
        foreignKey: 'categoryId',
        as: 'items'
      });
      PortfolioCategory.belongsTo(models.PortfolioCategory, {
        as: 'parent',
        foreignKey: 'parentId'
      });
      PortfolioCategory.hasMany(models.PortfolioCategory, {
        as: 'children',
        foreignKey: 'parentId'
      });
    }
  }

  PortfolioCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category name cannot be empty' },
        len: { args: [1, 255], msg: 'Category name must be at most 255 characters' }
      }
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Slug cannot be empty' },
        len: { args: [1, 255], msg: 'Slug must be at most 255 characters' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 500], msg: 'Description must be at most 500 characters' }
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'published'
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'portfolio_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    sequelize,
    modelName: 'PortfolioCategory',
    tableName: 'portfolio_categories',
    timestamps: true,
  });

  return PortfolioCategory;
};
