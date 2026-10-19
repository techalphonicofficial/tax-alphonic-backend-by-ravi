'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PortfolioItem extends Model {
    static associate(models) {
      // define association here
      PortfolioItem.belongsTo(models.PortfolioCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
    }
  }

  PortfolioItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title cannot be empty' },
        len: { args: [1, 255], msg: 'Title must be at most 255 characters' }
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
    clientName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Client name must be at most 255 characters' }
      }
    },
    websiteUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'Must be a valid URL' }
      }
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'portfolio_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'PortfolioItem',
    tableName: 'portfolio_items',
    timestamps: true,
  });

  return PortfolioItem;
};
