'use strict';
const { Model } = require('sequelize');

// A landing page on its own subdomain (<slug>.taxalphonic.com). The draft content lives in the
// linked `pages` row (pageId, edited with the Page Builder); the live content is the immutable
// version in publishedVersionId. See migration 20261023000000-create-landing-pages.js.
module.exports = (sequelize, DataTypes) => {
  class LandingPage extends Model {
    static associate(models) {
      LandingPage.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
      LandingPage.belongsTo(models.Page, { foreignKey: 'pageId', as: 'page' });
      LandingPage.belongsTo(models.LandingPageVersion, { foreignKey: 'publishedVersionId', as: 'publishedVersion', constraints: false });
      LandingPage.hasMany(models.LandingPageVersion, { foreignKey: 'landingPageId', as: 'versions' });
      LandingPage.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
      LandingPage.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater', constraints: false });
    }
  }

  LandingPage.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    serviceId: { type: DataTypes.UUID, allowNull: true },
    pageId: { type: DataTypes.UUID, allowNull: false },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Title is required' }, len: { args: [1, 255], msg: 'Title must be at most 255 characters' } },
    },
    slug: { type: DataTypes.STRING(63), allowNull: false, unique: true },
    metaTitle: DataTypes.STRING,
    metaDescription: DataTypes.TEXT,
    keywords: DataTypes.STRING(500),
    ogImage: DataTypes.STRING(500),
    robots: DataTypes.STRING(100),
    status: { type: DataTypes.ENUM('draft', 'published', 'archived'), allowNull: false, defaultValue: 'draft' },
    publishedVersionId: { type: DataTypes.UUID, allowNull: true },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    draftUpdatedAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    sequelize,
    modelName: 'LandingPage',
    tableName: 'landing_pages',
    timestamps: true,
  });

  return LandingPage;
};
