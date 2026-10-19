'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Testimonial extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  
  Testimonial.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    authorName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Author name cannot be empty' },
        len: { args: [2, 100], msg: 'Author name must be between 2 and 100 characters' }
      }
    },
    authorRole: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 100], msg: 'Author role must be at most 100 characters' }
      }
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 150], msg: 'Company must be at most 150 characters' }
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Content cannot be empty' },
        len: { args: [1, 1000], msg: 'Content must be at most 1000 characters' }
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: {
        min: { args: [1], msg: 'Rating must be at least 1' },
        max: { args: [5], msg: 'Rating must be at most 5' }
      }
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published',
    }
  }, {
    sequelize,
    modelName: 'Testimonial',
    tableName: 'testimonials',
    timestamps: true,
  });
  
  return Testimonial;
};
