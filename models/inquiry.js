'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');

module.exports = (sequelize, DataTypes) => {
  class Inquiry extends Model {
    static associate(models) {
      if (models.User) {
        Inquiry.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
      }
      if (models.Form) {
        Inquiry.belongsTo(models.Form, { foreignKey: 'formId', as: 'form' });
      }
    }
  }

  Inquiry.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
        len: { args: [2, 150], msg: 'Name must be between 2 and 150 characters' }
      }
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Email is required' },
        isEmail: { msg: 'Must be a valid email address' }
      }
    },
    phone: {
      // Optional at DB level for form-builder submissions; the website contact
      // form still requires it in InquiryService.create
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(150),
      defaultValue: 'Website',
    },
    status: {
      type: DataTypes.ENUM('NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'CLOSED', 'JUNK'),
      defaultValue: 'NEW',
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      defaultValue: 'MEDIUM',
    },
    notes: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    formId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Snapshot of every submitted field: [{ name, label, type, value }]
    formData: {
      type: DataTypes.JSON,
      allowNull: true,
      get: parseJsonColumn('formData'),
    }
  }, {
    sequelize,
    modelName: 'Inquiry',
    tableName: 'inquiries',
    timestamps: true,
    paranoid: true,
  });

  return Inquiry;
};
