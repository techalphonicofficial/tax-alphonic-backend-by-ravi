'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogFaq extends Model {
    static associate(models) {
      BlogFaq.belongsTo(models.Blog, {
        foreignKey: 'blogId',
        as: 'blog'
      });
    }
  }
  BlogFaq.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'blogs',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'BlogFaq',
    tableName: 'blog_faqs',
    timestamps: true,
  });
  return BlogFaq;
};
