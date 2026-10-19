'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Faq extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  
  Faq.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Question cannot be empty' },
        len: { args: [1, 500], msg: 'Question must be at most 500 characters' }
      }
    },
    answer: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Answer cannot be empty' }
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: { args: [0, 100], msg: 'Category must be at most 100 characters' }
      }
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published',
    }
  }, {
    sequelize,
    modelName: 'Faq',
    tableName: 'faqs',
    timestamps: true,
  });
  
  return Faq;
};
