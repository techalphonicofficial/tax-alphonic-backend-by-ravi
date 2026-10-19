'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogAuthor extends Model {
    static associate(models) {
      BlogAuthor.hasMany(models.Blog, {
        foreignKey: 'authorId',
        as: 'blogs'
      });
    }
  }
  BlogAuthor.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socialLinks: {
      type: DataTypes.JSON, // { twitter, linkedin, etc }
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'BlogAuthor',
    tableName: 'blog_authors',
    timestamps: true,
  });
  return BlogAuthor;
};
