'use strict';
const { Model } = require('sequelize');

// A website visitor's comment on a blog post. Only "approved" ones are public; "pending" waits for
// the admin (e.g. comments with links), "hidden" was taken down by the admin.
module.exports = (sequelize, DataTypes) => {
  class BlogComment extends Model {
    static associate(models) {
      BlogComment.belongsTo(models.Blog, { foreignKey: 'blogId', as: 'blog' });
    }
  }
  BlogComment.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    blogId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(80), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('approved', 'pending', 'hidden'), defaultValue: 'approved' },
    visitorId: { type: DataTypes.STRING(64), allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  }, {
    sequelize,
    modelName: 'BlogComment',
    tableName: 'blog_comments',
    timestamps: true,
  });
  return BlogComment;
};
