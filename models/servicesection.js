'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceSection extends Model {
    static associate(models) {
      ServiceSection.belongsTo(models.Service, {
        foreignKey: 'serviceId',
        as: 'service',
        onDelete: 'CASCADE'
      });
      ServiceSection.belongsTo(models.SectionType, {
        foreignKey: 'sectionTypeId',
        as: 'type'
      });
      ServiceSection.hasOne(models.ServiceSectionData, {
        foreignKey: 'serviceSectionId',
        as: 'data',
        onDelete: 'CASCADE'
      });
    }
  }
  
  ServiceSection.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sectionTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    config: {
      type: DataTypes.JSON, // e.g. padding, background color, custom classes
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'ServiceSection',
    tableName: 'service_sections',
    timestamps: true,
  });
  
  return ServiceSection;
};
