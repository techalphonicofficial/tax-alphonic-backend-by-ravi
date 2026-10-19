'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BlogTag extends Model {
    static associate(models) {
      BlogTag.belongsToMany(models.Blog, {
        through: 'blog_tag_map',
        foreignKey: 'tagId',
        otherKey: 'blogId',
        as: 'blogs'
      });
    }
  }
  BlogTag.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    }
  }, {
    sequelize,
    modelName: 'BlogTag',
    tableName: 'blog_tags',
    timestamps: true,
  });
  return BlogTag;
};
