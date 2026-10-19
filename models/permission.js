'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsToMany(models.Role, {
        through: 'RolePermissions',
        as: 'roles',
        foreignKey: 'permissionId'
      });
    }
  }
  Permission.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    module: {
      type: DataTypes.STRING, // e.g., 'Users', 'Pages', 'Blogs'
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING, // e.g., 'create', 'read', 'update', 'delete'
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    }
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    timestamps: true,
  });
  return Permission;
};
