'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceSectionData extends Model {
    static associate(models) {
      ServiceSectionData.belongsTo(models.ServiceSection, {
        foreignKey: 'serviceSectionId',
        as: 'section',
        onDelete: 'CASCADE'
      });
    }
  }
  
  ServiceSectionData.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceSectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // One-to-One
    },
    payload: {
      type: DataTypes.JSON, // The actual dynamic content: headings, HTML, features array
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'ServiceSectionData',
    tableName: 'service_section_data',
    timestamps: true,
  });
  
  return ServiceSectionData;
};
