'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.hasMany(models.ServiceSection, {
        foreignKey: 'serviceId',
        as: 'sections',
        onDelete: 'CASCADE'
      });
      Service.belongsTo(models.ServiceCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      Service.belongsTo(models.Service, {
        foreignKey: 'parentId',
        as: 'parent'
      });
    }
  }
  Service.init({
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
    shortDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 300], msg: 'Short description must be at most 300 characters' }
      }
    },
    longDescription: DataTypes.TEXT('long'),
    icon: DataTypes.STRING,
    bannerImage: DataTypes.STRING,
    thumbImage: DataTypes.STRING,
    gallery: {
      type: DataTypes.JSON, // Store array of image URLs/IDs
    },
    features: {
      type: DataTypes.JSON, // Array of features
    },
    benefits: {
      type: DataTypes.JSON, // Array of benefits
    },
    process: {
      type: DataTypes.JSON, // Array of steps
    },
    serviceAreas: {
      type: DataTypes.JSON, // For PSEO: cities/states
    },
    summary: DataTypes.TEXT,
    categoryId: DataTypes.UUID, // Reference to ServiceCategory
    parentId: DataTypes.UUID, // Parent service for sub-services
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readingTime: DataTypes.INTEGER, // in minutes
    author: DataTypes.STRING,
    publishDate: DataTypes.DATE,
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
    schemaMarkup: DataTypes.TEXT, // JSON-LD
    otherTags: DataTypes.TEXT, // Custom raw HTML meta tags
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
    paranoid: true,
    timestamps: true,
  });
  return Service;
};
