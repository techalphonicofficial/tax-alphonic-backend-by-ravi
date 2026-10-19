'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Menu extends Model {
    static associate(models) {
      Menu.hasMany(models.MenuItem, { foreignKey: 'menuId', as: 'items', onDelete: 'CASCADE' });
    }
  }

  Menu.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(50),
      allowNull: true, // e.g., 'header', 'footer'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    // Display options as JSON (the footer menu: hiring strip, contact, copyright, ...).
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('settings');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      },
      set(value) {
        this.setDataValue('settings', value == null || value === '' ? null : (typeof value === 'string' ? value : JSON.stringify(value)));
      }
    }
  }, {
    sequelize,
    modelName: 'Menu',
    tableName: 'menus',
    timestamps: true,
    // Deleted menus go to the Trash (migration 20261017000002); their items stay until purged.
    paranoid: true,
  });

  return Menu;
};
