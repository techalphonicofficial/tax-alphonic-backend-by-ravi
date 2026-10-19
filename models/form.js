'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');
module.exports = (sequelize, DataTypes) => {
  class Form extends Model {
    static associate(models) {
      Form.hasMany(models.Inquiry, { foreignKey: 'formId', as: 'submissions' });
    }
  }
  Form.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Form name is required' }
      }
    },
    slug: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Field definitions: [{ id, type, label, name, placeholder, helpText, required, width, options, defaultValue, validation, mapTo }]
    fields: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get: parseJsonColumn('fields', []),
    },
    // { submitButtonText, successMessage, redirectUrl, source, sendEmailNotification }
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get: parseJsonColumn('settings', {}),
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    }
  }, {
    sequelize,
    modelName: 'Form',
    tableName: 'forms',
    paranoid: true,
    timestamps: true,
  });
  return Form;
};
