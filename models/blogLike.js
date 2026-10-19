'use strict';
const { Model } = require('sequelize');

// One like of a website visitor (visitorId = the site's anonymous cookie) on a blog post.
module.exports = (sequelize, DataTypes) => {
  class BlogLike extends Model {
    static associate(models) {
      BlogLike.belongsTo(models.Blog, { foreignKey: 'blogId', as: 'blog' });
    }
  }
  BlogLike.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    blogId: { type: DataTypes.UUID, allowNull: false },
    visitorId: { type: DataTypes.STRING(64), allowNull: false },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  }, {
    sequelize,
    modelName: 'BlogLike',
    tableName: 'blog_likes',
    timestamps: true,
  });
  return BlogLike;
};
