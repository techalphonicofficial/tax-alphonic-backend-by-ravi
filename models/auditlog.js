'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  AuditLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // System actions might not have a userId
    },
    action: {
      type: DataTypes.STRING, // e.g. 'CREATE', 'UPDATE', 'DELETE'
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING, // e.g. 'Users', 'Roles', 'Blogs'
      allowNull: false,
    },
    recordId: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    oldData: {
      type: DataTypes.JSON,
      get: parseJsonColumn('oldData'),
    },
    newData: {
      type: DataTypes.JSON,
      get: parseJsonColumn('newData'),
    },
    ipAddress: {
      type: DataTypes.STRING,
    },
    userAgent: {
      type: DataTypes.STRING,
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
  });
  return AuditLog;
};
