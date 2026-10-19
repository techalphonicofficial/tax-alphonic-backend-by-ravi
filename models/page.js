'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');
module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    static associate(models) {
      // define association here
    }
  }
  Page.init({
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
    content: {
      type: DataTypes.TEXT('long'),
    },
    // Page Builder blocks: [{ id, type, config, data: { payload } }]
    sections: {
      type: DataTypes.JSON,
      allowNull: true,
      get: parseJsonColumn('sections', []),
    },
    // SEO Fields (PSEO Ready)
    metaTitle: DataTypes.STRING,
    metaDescription: DataTypes.TEXT,
    keywords: DataTypes.STRING,
    canonicalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'Must be a valid URL' }
      }
    },
    robots: DataTypes.STRING,
    ogImage: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'Must be a valid URL' }
      }
    },
    ogTitle: DataTypes.STRING,
    ogDescription: DataTypes.TEXT,
    twitterCard: DataTypes.STRING,
    schemaMarkup: DataTypes.TEXT, // JSON-LD Structured Data
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft'
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'Page',
    tableName: 'pages',
    paranoid: true,
    timestamps: true,
  });
  return Page;
};
