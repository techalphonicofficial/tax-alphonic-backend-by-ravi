'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SectionType extends Model {
    static associate(models) {
      SectionType.hasMany(models.ServiceSection, {
        foreignKey: 'sectionTypeId',
        as: 'instances'
      });
    }
  }
  
  SectionType.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    componentKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING, // e.g., 'Hero', 'Content', 'CTA'
      defaultValue: 'Content'
    },
    defaultSchema: {
      type: DataTypes.JSON, // Default blank payload fields
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'SectionType',
    tableName: 'section_types',
    timestamps: true,
  });
  
  return SectionType;
};
