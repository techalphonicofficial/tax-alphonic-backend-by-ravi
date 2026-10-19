'use strict';
const { Model } = require('sequelize');

// TEXT column holding JSON (MariaDB-safe), same approach as menus.settings
const jsonText = (DataTypes, field) => ({
  type: DataTypes.TEXT,
  allowNull: true,
  get() {
    const raw = this.getDataValue(field);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  set(value) {
    this.setDataValue(field, value == null ? null : (typeof value === 'string' ? value : JSON.stringify(value)));
  }
});

module.exports = (sequelize, DataTypes) => {
  class AiSetting extends Model {}
  AiSetting.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // One row per feature that uses AI; 'pseo' for the matrix content generator
    scope: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    activeProvider: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    // { openai: { apiKey (encrypted), model }, anthropic: {...}, gemini: {...} }
    providers: jsonText(DataTypes, 'providers'),
    // { temperature, maxOutputTokens, maxRetries, timeoutSeconds, systemPrompt, defaultTier, defaultTone }
    generation: jsonText(DataTypes, 'generation'),
    sections: jsonText(DataTypes, 'sections'),
    wordCountTiers: jsonText(DataTypes, 'wordCountTiers'),
    toneOptions: jsonText(DataTypes, 'toneOptions'),
  }, {
    sequelize,
    modelName: 'AiSetting',
    tableName: 'ai_settings',
    timestamps: true,
  });
  return AiSetting;
};
