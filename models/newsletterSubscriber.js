'use strict';
const { Model } = require('sequelize');

// An email address signed up through a website Newsletter block (POST /newsletter/subscribe).
// One row per address (unique email); "unsubscribed" keeps the row so the admin still sees it.
module.exports = (sequelize, DataTypes) => {
  class NewsletterSubscriber extends Model {}
  NewsletterSubscriber.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: true },
    status: { type: DataTypes.ENUM('subscribed', 'unsubscribed'), allowNull: false, defaultValue: 'subscribed' },
    source: { type: DataTypes.STRING(255), allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    subscribedAt: { type: DataTypes.DATE, allowNull: true },
    unsubscribedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'NewsletterSubscriber',
    tableName: 'newsletter_subscribers',
    timestamps: true,
  });
  return NewsletterSubscriber;
};
