'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Blog extends Model {
    static associate(models) {
      Blog.belongsTo(models.BlogCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      Blog.belongsTo(models.BlogAuthor, {
        foreignKey: 'authorId',
        as: 'author'
      });
      Blog.belongsToMany(models.BlogTag, {
        through: 'blog_tag_map',
        foreignKey: 'blogId',
        otherKey: 'tagId',
        as: 'tags'
      });
      Blog.hasMany(models.BlogFaq, {
        foreignKey: 'blogId',
        as: 'faqs'
      });
      Blog.hasMany(models.BlogLike, { foreignKey: 'blogId', as: 'likes' });
      Blog.hasMany(models.BlogComment, { foreignKey: 'blogId', as: 'comments' });
    }
  }
  Blog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title cannot be empty' },
        len: { args: [1, 255], msg: 'Title must be at most 255 characters' }
      }
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Slug cannot be empty' },
        len: { args: [1, 255], msg: 'Slug must be at most 255 characters' }
      }
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 500], msg: 'Excerpt must be at most 500 characters' }
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled', 'archived', 'trash'),
      defaultValue: 'draft',
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: { msg: 'Category is required' }
      },
      references: {
        model: 'blog_categories',
        key: 'id'
      }
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: { msg: 'Author is required' }
      },
      references: {
        model: 'blog_authors',
        key: 'id'
      }
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gallery: {
      type: DataTypes.JSON, // Array of strings (URLs)
      allowNull: true,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isTrending: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isSticky: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metaTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Meta Title must be at most 255 characters' }
      }
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 300], msg: 'Meta Description must be at most 300 characters' }
      }
    },
    keywords: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    canonicalUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ogImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ogTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'OG Title must be at most 255 characters' }
      }
    },
    ogDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 300], msg: 'OG Description must be at most 300 characters' }
      }
    },
    twitterCard: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    schemaMarkup: DataTypes.JSON,
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    shareCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    readTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // in minutes
    },
    publishDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Blog',
    tableName: 'blogs',
    paranoid: true, // Enables soft deletes
    timestamps: true,
  });
  return Blog;
};
