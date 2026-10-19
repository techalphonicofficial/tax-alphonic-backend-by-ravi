const db = require('./models');
const bcrypt = require('bcrypt');

async function createTestUser() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create or find Role
        const [role] = await db.Role.findOrCreate({
            where: { name: 'SEO Manager' },
            defaults: { description: 'Can only edit services meta data' }
        });

        // 2. Create Permissions for Services (read and update)
        const [permRead] = await db.Permission.findOrCreate({
            where: { module: 'Services', action: 'read' },
            defaults: { description: 'View Services' }
        });
        const [permUpdate] = await db.Permission.findOrCreate({
            where: { module: 'Services', action: 'update' },
            defaults: { description: 'Update Services' }
        });
        const [permDashboard] = await db.Permission.findOrCreate({
            where: { module: 'Dashboard', action: 'read' },
            defaults: { description: 'View Dashboard' }
        });

        // 3. Assign Permissions to Role
        await db.RolePermission.findOrCreate({ where: { roleId: role.id, permissionId: permRead.id } });
        await db.RolePermission.findOrCreate({ where: { roleId: role.id, permissionId: permUpdate.id } });
        await db.RolePermission.findOrCreate({ where: { roleId: role.id, permissionId: permDashboard.id } });

        // 4. Create User
        const [user, created] = await db.User.findOrCreate({
            where: { email: 'seo@digitalprisma.com' },
            defaults: {
                firstName: 'SEO',
                lastName: 'Manager',
                password: 'password123',
                roleId: role.id,
                isActive: true
            }
        });
        
        if (!created) {
            // Need to update the password to trigger the hook properly, 
            // but since findOrCreate already exists, we can force update
            await user.update({ roleId: role.id, password: 'password123', isActive: true });
        }

        console.log('Test user created successfully!');
        console.log('Email: seo@digitalprisma.com');
        console.log('Password: password123');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

createTestUser();
