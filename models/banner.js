const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Banner = sequelize.define('Banner', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: { args: [0, 150], msg: 'Title must be at most 150 characters' }
            }
        },
        subtitle: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: { args: [0, 255], msg: 'Subtitle must be at most 255 characters' }
            }
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Image URL cannot be empty' }
            }
        },
        mobileImageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        linkUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        buttonText: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: { args: [0, 50], msg: 'Button text must be at most 50 characters' }
            }
        },
        linkTarget: {
            type: DataTypes.ENUM('_self', '_blank'),
            defaultValue: '_self',
        },
        textAlignment: {
            type: DataTypes.ENUM('left', 'center', 'right'),
            defaultValue: 'left',
        },
        textColorTheme: {
            type: DataTypes.ENUM('light', 'dark'),
            defaultValue: 'light',
        },
        startDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        videoUrl: {
            type: DataTypes.STRING,
            allowNull: true,
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
        tableName: 'banners',
        timestamps: true,
    });

    return Banner;
};
