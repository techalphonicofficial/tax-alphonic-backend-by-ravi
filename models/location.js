'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Location.hasMany(models.Seopage, { foreignKey: 'locationId', as: 'seoPages' });
      Location.belongsTo(models.State, { foreignKey: 'stateId', as: 'stateMaster' });
      Location.belongsTo(models.Country, { foreignKey: 'countryId', as: 'countryMaster' });
    }
  }
  Location.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    stateId: DataTypes.UUID,
    countryId: DataTypes.UUID,
    description: DataTypes.TEXT,
    businessProfile: DataTypes.JSON,
    active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    paranoid: true,
  });
  return Location;
};