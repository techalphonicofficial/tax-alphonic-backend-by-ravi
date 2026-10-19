'use strict';

// Website blog engagement: one like per visitor per post (blog_likes) and visitor comments
// (blog_comments). blogs.likeCount stays the cached total; comments are counted live.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    const blogId = {
      type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
      allowNull: false,
      references: { model: 'blogs', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    };

    if (!tables.includes('blog_likes')) {
      await queryInterface.createTable('blog_likes', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        blogId,
        visitorId: { type: Sequelize.STRING(64), allowNull: false },
        ipAddress: { type: Sequelize.STRING(64), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('blog_likes', ['blogId', 'visitorId'], { unique: true, name: 'blog_likes_blog_visitor' });
      await queryInterface.addIndex('blog_likes', ['createdAt'], { name: 'blog_likes_created' });
    }

    if (!tables.includes('blog_comments')) {
      await queryInterface.createTable('blog_comments', {
        id: { type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin', allowNull: false, primaryKey: true },
        blogId,
        name: { type: Sequelize.STRING(80), allowNull: false },
        email: { type: Sequelize.STRING(160), allowNull: true },
        body: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.ENUM('approved', 'pending', 'hidden'), allowNull: false, defaultValue: 'approved' },
        visitorId: { type: Sequelize.STRING(64), allowNull: true },
        ipAddress: { type: Sequelize.STRING(64), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('blog_comments', ['blogId', 'status', 'createdAt'], { name: 'blog_comments_feed' });
      await queryInterface.addIndex('blog_comments', ['createdAt'], { name: 'blog_comments_created' });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('blog_comments');
    await queryInterface.dropTable('blog_likes');
  },
};
