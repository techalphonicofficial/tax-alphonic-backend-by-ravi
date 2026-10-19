const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Seo = sequelize.define('Seo', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        route: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "URL path, e.g., /about-us",
            validate: {
                notEmpty: { msg: 'Route cannot be empty' },
                len: { args: [1, 255], msg: 'Route must be at most 255 characters' }
            }
        },
        metaTitle: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        metaDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        keywords: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        canonicalUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            set(val) {
                this.setDataValue('canonicalUrl', val === '' ? null : val);
            },
            validate: {
                isUrl: { msg: 'Must be a valid URL' }
            }
        },
        // A full URL or a Media library path (/uploads/...).
        ogImage: {
            type: DataTypes.STRING,
            allowNull: true,
            set(val) {
                this.setDataValue('ogImage', val === '' ? null : val);
            },
            validate: {
                isUrlOrPath(value) {
                    if (value && !/^(https?:\/\/\S+|\/?uploads\/\S+|\/\S+)$/i.test(value)) throw new Error('OG image must be a URL or a Media path');
                }
            }
        },
        // What this config is for (see migration 20261017000001): service | page | seo_page | static | custom.
        targetType: { type: DataTypes.STRING(20), allowNull: true },
        targetId: { type: DataTypes.STRING(64), allowNull: true },
        targetLabel: { type: DataTypes.STRING(255), allowNull: true },
        robots: { type: DataTypes.STRING(50), allowNull: true },
        ogTitle: { type: DataTypes.STRING(255), allowNull: true },
        ogDescription: { type: DataTypes.TEXT, allowNull: true },
        twitterCard: { type: DataTypes.STRING(30), allowNull: true },
        schemaMarkup: { type: DataTypes.TEXT('long'), allowNull: true },
        otherMetaTags: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Custom HTML meta tags, scripts, etc.",
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
        }
    }, {
        tableName: 'seos',
        timestamps: true,
        // Deleted configs go to the Trash (migration 20261017000002).
        paranoid: true,
    });

    return Seo;
};
