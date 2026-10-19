'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AboutPage extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  
  AboutPage.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    heroTitle: { type: DataTypes.STRING },
    heroSubtitle: { type: DataTypes.TEXT },
    overviewHeading: { type: DataTypes.STRING },
    overviewDescription: { type: DataTypes.TEXT },
    missionText: { type: DataTypes.TEXT },
    visionText: { type: DataTypes.TEXT },
    statYears: { type: DataTypes.STRING },
    statYearsLabel: { type: DataTypes.STRING },
    statYearsDesc: { type: DataTypes.TEXT },
    statProjects: { type: DataTypes.STRING },
    statProjectsLabel: { type: DataTypes.STRING },
    statProjectsDesc: { type: DataTypes.TEXT },
    statExperts: { type: DataTypes.STRING },
    statExpertsLabel: { type: DataTypes.STRING },
    statExpertsDesc: { type: DataTypes.TEXT },
    statRetention: { type: DataTypes.STRING },
    statRetentionLabel: { type: DataTypes.STRING },
    statRetentionDesc: { type: DataTypes.TEXT },
    aboutImage: { type: DataTypes.STRING },
    homeAboutHeading: { type: DataTypes.STRING },
    homeAboutDescription: { type: DataTypes.TEXT },
    homeAboutImage: { type: DataTypes.STRING },
    coreValues: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    historyTimeline: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'AboutPage',
    tableName: 'about_pages',
    timestamps: true,
  });
  
  return AboutPage;
};
