'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDesc = await queryInterface.describeTable('inquiries');
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!tableDesc.formId) {
                await queryInterface.addColumn('inquiries', 'formId', {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: { model: 'forms', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                }, { transaction });
            }

            if (!tableDesc.formData) {
                await queryInterface.addColumn('inquiries', 'formData', {
                    type: Sequelize.JSON,
                    allowNull: true,
                }, { transaction });
            }

            // Form submissions may not collect a phone number
            await queryInterface.changeColumn('inquiries', 'phone', {
                type: Sequelize.STRING(50),
                allowNull: true,
            }, { transaction });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('inquiries', 'formData', { transaction });
            await queryInterface.removeColumn('inquiries', 'formId', { transaction });
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
