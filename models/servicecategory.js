'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceCategory extends Model {
    static associate(models) {
      ServiceCategory.belongsTo(models.ServiceCategory, {
        as: 'parent',
        foreignKey: 'parentId'
      });
      ServiceCategory.hasMany(models.ServiceCategory, {
        as: 'children',
        foreignKey: 'parentId'
      });
      ServiceCategory.hasMany(models.Service, {
        foreignKey: 'categoryId',
        as: 'services'
      });
    }
  }
  ServiceCategory.init({
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
      allowNull: true
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'service_categories',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft'
    }
  }, {
    sequelize,
    modelName: 'ServiceCategory',
    tableName: 'service_categories',
    paranoid: true,
    timestamps: true,
  });
  return ServiceCategory;
};
