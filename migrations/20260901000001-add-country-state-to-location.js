'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDesc = await queryInterface.describeTable('locations');
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!tableDesc.countryId) {
                await queryInterface.addColumn('locations', 'countryId', {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: { model: 'countries', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT'
                }, { transaction });
            }

            if (!tableDesc.stateId) {
                await queryInterface.addColumn('locations', 'stateId', {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: { model: 'states', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT'
                }, { transaction });
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('locations', 'stateId', { transaction });
            await queryInterface.removeColumn('locations', 'countryId', { transaction });
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
