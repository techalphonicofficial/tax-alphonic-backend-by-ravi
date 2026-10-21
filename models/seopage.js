'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SeoPage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SeoPage.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
      SeoPage.belongsTo(models.Location, { foreignKey: 'locationId', as: 'location' });
      SeoPage.belongsTo(models.Industry, { foreignKey: 'industryId', as: 'industry' });
      SeoPage.belongsTo(models.Technology, { foreignKey: 'technologyId', as: 'technology' });
      SeoPage.belongsTo(models.Problem, { foreignKey: 'problemId', as: 'problem' });
    }
  }
  SeoPage.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: DataTypes.STRING,
    pageType: DataTypes.STRING,
    title: DataTypes.STRING,
    metaTitle: DataTypes.STRING,
    metaDescription: DataTypes.TEXT,
    canonicalUrl: DataTypes.STRING,
    serviceId: DataTypes.UUID,
    locationId: DataTypes.UUID,
    industryId: DataTypes.UUID,
    technologyId: DataTypes.UUID,
    problemId: DataTypes.UUID,
    status: DataTypes.STRING,
    indexable: DataTypes.BOOLEAN,
    priority: DataTypes.INTEGER,
    publishedAt: DataTypes.DATE,
    contentSource: DataTypes.STRING,
    aiGenerationStatus: DataTypes.STRING,
    qualityScore: DataTypes.INTEGER,
    longDescription: DataTypes.TEXT('long')
  }, {
    sequelize,
    modelName: 'Seopage',
    tableName: 'seopages',
    paranoid: true,
  });
  return SeoPage;
};