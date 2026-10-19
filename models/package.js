'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');

module.exports = (sequelize, DataTypes) => {
  class Package extends Model {
    static associate(models) {
      // define association here if needed
    }
  }

  Package.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name cannot be empty' },
        len: { args: [1, 255], msg: 'Name must be at most 255 characters' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isRecommended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'SEO',
    },
    keywordTiers: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of keyword tiers e.g. [{ label: "30 Keywords", pricingPlans: [...] }]',
      get: parseJsonColumn('keywordTiers', null),
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Features object containing sections and hiddenSections',
      get: parseJsonColumn('features', null),
    },
    pricingPlans: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of pricing options for simple packages without tiers',
      get: parseJsonColumn('pricingPlans', null),
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    }
  }, {
    sequelize,
    modelName: 'Package',
    tableName: 'packages',
    timestamps: true,
  });

  return Package;
};
