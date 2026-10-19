'use strict';
const { Model } = require('sequelize');

// Media storage settings (one row): the active provider and each provider's settings.
// Secrets inside `providers` are encrypted with utils/secretBox.js. See services/storage/.
const jsonText = (DataTypes, field) => ({
  type: DataTypes.TEXT('long'),
  allowNull: true,
  get() {
    const raw = this.getDataValue(field);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  set(value) {
    this.setDataValue(field, value == null ? null : JSON.stringify(value));
  },
});

module.exports = (sequelize, DataTypes) => {
  class StorageSetting extends Model {}

  StorageSetting.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    activeProvider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'local' },
    providers: jsonText(DataTypes, 'providers'),
    lastTest: jsonText(DataTypes, 'lastTest'),
  }, {
    sequelize,
    modelName: 'StorageSetting',
    tableName: 'storage_settings',
    timestamps: true,
  });

  return StorageSetting;
};
