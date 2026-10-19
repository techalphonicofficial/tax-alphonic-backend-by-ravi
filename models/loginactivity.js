'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoginActivity extends Model {
    static associate(models) {
      LoginActivity.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  LoginActivity.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // true because we might log failed attempts with unknown user
    },
    email: {
      type: DataTypes.STRING,
    },
    ipAddress: {
      type: DataTypes.STRING,
    },
    userAgent: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED'),
      allowNull: false,
    },
    failureReason: {
      type: DataTypes.STRING,
    }
  }, {
    sequelize,
    modelName: 'LoginActivity',
    tableName: 'login_activities',
    timestamps: true,
    updatedAt: false, // We only care about when it was created
  });
  return LoginActivity;
};
