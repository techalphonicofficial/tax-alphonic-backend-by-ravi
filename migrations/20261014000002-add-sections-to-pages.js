'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableDesc = await queryInterface.describeTable('pages');
        if (!tableDesc.sections) {
            // Page Builder blocks: [{ id, type, config, data: { payload } }]
            await queryInterface.addColumn('pages', 'sections', {
                type: Sequelize.JSON,
                allowNull: true,
            });
        }
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('pages', 'sections');
    }
};
