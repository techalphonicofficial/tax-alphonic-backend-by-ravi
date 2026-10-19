require('dotenv').config();
const { sequelize, User, Role, Permission, LoginActivity, AuditLog, PasswordResetToken, TeamMember, Faq, Banner, Page, MediaFolder, MediaCategory, Media, MediaUsage, MediaAuditLog, Setting, BlogCategory, BlogAuthor, BlogTag, Blog, BlogFaq } = require('./models');

async function syncDb() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Core Models
    await Role.sync({ alter: true });
    await Permission.sync({ alter: true });
    await User.sync({ alter: true });
    if (sequelize.models.RolePermissions) {
        await sequelize.models.RolePermissions.sync({ alter: true });
    }
    
    await LoginActivity.sync({ alter: true });
    await AuditLog.sync({ alter: true });
    await PasswordResetToken.sync({ alter: true });

    await Page.sync({ alter: true });
    await Setting.sync({ alter: true });

    // Blog Module Phase 1
    await BlogCategory.sync({ alter: true });
    await BlogAuthor.sync({ alter: true });
    await BlogTag.sync({ alter: true });
    await Blog.sync({ alter: true });
    if (sequelize.models.blog_tag_map) {
      await sequelize.models.blog_tag_map.sync({ alter: true });
    }
    await BlogFaq.sync({ alter: true });
    
    // Media Models (respect foreign key order)
    await MediaFolder.sync({ alter: true });
    await MediaCategory.sync({ alter: true });
    await Media.sync({ alter: true });
    await MediaUsage.sync({ alter: true });
    await MediaAuditLog.sync({ alter: true });
    
    console.log('Models were synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

syncDb();
