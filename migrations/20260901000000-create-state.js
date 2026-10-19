'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('states', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },
            slug: {
                type: Sequelize.STRING(250),
                allowNull: false,
                unique: true,
            },
            countryId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'countries',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive'),
                defaultValue: 'active',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deletedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            }
        });

        await queryInterface.addIndex('states', ['slug']);
        await queryInterface.addIndex('states', ['countryId']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('states');
    }
};
