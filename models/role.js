'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.User, { foreignKey: 'roleId', as: 'users' });
      Role.belongsToMany(models.Permission, {
        through: 'rolepermissions',
        as: 'permissions',
        foreignKey: 'roleId'
      });
    }
  }
  Role.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    paranoid: true, // Soft deletes
    timestamps: true,
  });
  return Role;
};
