'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class State extends Model {
        static associate(models) {
            State.belongsTo(models.Country, { foreignKey: 'countryId', as: 'country' });
            State.hasMany(models.Location, { foreignKey: 'stateId', as: 'locations' });
        }
    }

    State.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING(250),
            allowNull: false,
            unique: true
        },
        countryId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'countries',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
        }
    }, {
        sequelize,
        modelName: 'State',
        tableName: 'states',
        timestamps: true,
        paranoid: true,
    });

    return State;
};
