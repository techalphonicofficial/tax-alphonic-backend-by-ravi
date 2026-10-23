'use strict';
const { Model } = require('sequelize');
const { parseJsonColumn } = require('../utils/jsonColumn');

// Immutable published snapshot of a landing page (one row per publish, never updated).
module.exports = (sequelize, DataTypes) => {
  class LandingPageVersion extends Model {
    static associate(models) {
      LandingPageVersion.belongsTo(models.LandingPage, { foreignKey: 'landingPageId', as: 'landingPage' });
      LandingPageVersion.belongsTo(models.User, { foreignKey: 'publishedBy', as: 'publisher', constraints: false });
    }
  }

  LandingPageVersion.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    landingPageId: { type: DataTypes.UUID, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING(63), allowNull: false },
    serviceId: { type: DataTypes.UUID, allowNull: true },
    sections: { type: DataTypes.JSON, allowNull: false, get: parseJsonColumn('sections', []) },
    seo: { type: DataTypes.JSON, allowNull: true, get: parseJsonColumn('seo', {}) },
    publishedBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    sequelize,
    modelName: 'LandingPageVersion',
    tableName: 'landing_page_versions',
    timestamps: true,
    updatedAt: false,
    hooks: {
      // Snapshots are written once.
      beforeUpdate: () => { throw new Error('Published landing page versions cannot be changed'); },
    },
  });

  return LandingPageVersion;
};
