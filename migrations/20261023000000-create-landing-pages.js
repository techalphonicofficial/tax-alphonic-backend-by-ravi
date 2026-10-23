'use strict';

// Landing pages on subdomains (cbdt.taxalphonic.com). Additive only: two new tables, no change
// to existing ones.
// - landing_pages: one row per landing page. Its draft content is a normal `pages` row (pageId,
//   edited with the existing Page Builder; never published as a normal page). serviceId links the
//   service master (optional, several campaigns per service are allowed); slug is the subdomain
//   label and is unique across all landing pages, archived ones included.
// - landing_page_versions: an immutable snapshot per publish. The website only reads the version
//   in landing_pages.publishedVersionId, so saving a draft never changes the live page.
// down() drops both tables (published snapshots are lost; the draft pages stay in `pages`).
const UUID = 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    const ref = (model, { allowNull = true, onDelete = 'SET NULL' } = {}) => ({
      type: UUID,
      allowNull,
      references: { model, key: 'id' },
      onDelete,
      onUpdate: 'CASCADE',
    });

    if (!tables.includes('landing_pages')) {
      await queryInterface.createTable('landing_pages', {
        id: { type: UUID, allowNull: false, primaryKey: true },
        serviceId: ref('services'),
        // RESTRICT: the draft page cannot be removed while its landing page exists.
        pageId: ref('pages', { allowNull: false, onDelete: 'RESTRICT' }),
        title: { type: Sequelize.STRING(255), allowNull: false },
        slug: { type: Sequelize.STRING(63), allowNull: false },
        metaTitle: { type: Sequelize.STRING(255), allowNull: true },
        metaDescription: { type: Sequelize.TEXT, allowNull: true },
        keywords: { type: Sequelize.STRING(500), allowNull: true },
        ogImage: { type: Sequelize.STRING(500), allowNull: true },
        robots: { type: Sequelize.STRING(100), allowNull: true },
        status: { type: Sequelize.ENUM('draft', 'published', 'archived'), allowNull: false, defaultValue: 'draft' },
        publishedVersionId: { type: UUID, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        draftUpdatedAt: { type: Sequelize.DATE, allowNull: true },
        createdBy: ref('users'),
        updatedBy: ref('users'),
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('landing_pages', ['slug'], { unique: true, name: 'landing_pages_slug_unique' });
      await queryInterface.addIndex('landing_pages', ['pageId'], { unique: true, name: 'landing_pages_page_unique' });
      await queryInterface.addIndex('landing_pages', ['status', 'updatedAt'], { name: 'landing_pages_status_updated' });
    }

    if (!tables.includes('landing_page_versions')) {
      await queryInterface.createTable('landing_page_versions', {
        id: { type: UUID, allowNull: false, primaryKey: true },
        landingPageId: ref('landing_pages', { allowNull: false, onDelete: 'CASCADE' }),
        version: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING(255), allowNull: false },
        slug: { type: Sequelize.STRING(63), allowNull: false },
        serviceId: { type: UUID, allowNull: true },
        // { id, type, config, data: { payload } }[] including the LandingHeader / LandingFooter blocks
        sections: { type: Sequelize.JSON, allowNull: false },
        // { metaTitle, metaDescription, keywords, ogImage, robots }
        seo: { type: Sequelize.JSON, allowNull: true },
        publishedBy: ref('users'),
        createdAt: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('landing_page_versions', ['landingPageId', 'version'], { unique: true, name: 'landing_page_versions_page_version' });
    }

    // Added last: the two tables reference each other.
    const [constraints] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'landing_pages' AND CONSTRAINT_NAME = 'landing_pages_published_version_fk'"
    );
    if (!constraints.length) {
      await queryInterface.addConstraint('landing_pages', {
        fields: ['publishedVersionId'],
        type: 'foreign key',
        name: 'landing_pages_published_version_fk',
        references: { table: 'landing_page_versions', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tables.includes('landing_pages')) {
      await queryInterface.removeConstraint('landing_pages', 'landing_pages_published_version_fk').catch(() => {});
    }
    if (tables.includes('landing_page_versions')) await queryInterface.dropTable('landing_page_versions');
    if (tables.includes('landing_pages')) await queryInterface.dropTable('landing_pages');
  },
};
