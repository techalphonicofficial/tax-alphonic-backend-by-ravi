'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MediaAuditLog extends Model {
    static associate(models) {
      MediaAuditLog.belongsTo(models.Media, { as: 'media', foreignKey: 'mediaId' });
      // MediaAuditLog.belongsTo(models.User, { as: 'user', foreignKey: 'userId' }); // Assuming User model exists
    }
  }

  MediaAuditLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mediaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'media',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of user who performed the action'
    },
    action: {
      type: DataTypes.ENUM('UPLOAD', 'RENAME', 'MOVE', 'DELETE', 'RESTORE'),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Any additional details about the action'
    }
  }, {
    sequelize,
    modelName: 'MediaAuditLog',
    tableName: 'media_audit_logs',
    timestamps: true, // createdAt will act as timestamp
  });

  return MediaAuditLog;
};
