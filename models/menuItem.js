'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItem extends Model {
    static associate(models) {
      MenuItem.belongsTo(models.Menu, { foreignKey: 'menuId', as: 'menu' });
      MenuItem.belongsTo(models.MenuItem, { foreignKey: 'parentId', as: 'parent' });
      MenuItem.hasMany(models.MenuItem, { foreignKey: 'parentId', as: 'children' });
    }
  }

  MenuItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    menuId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    target: {
      type: DataTypes.STRING(20),
      defaultValue: '_self', // e.g., '_self', '_blank'
    },
    // Emoji or image URL; empty = the website's default icon.
    icon: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
    timestamps: true,
  });

  return MenuItem;
};
