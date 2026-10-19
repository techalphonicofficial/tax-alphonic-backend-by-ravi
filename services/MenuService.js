const MenuRepository = require('../repositories/MenuRepository');
const MenuItemRepository = require('../repositories/MenuItemRepository');
const BaseService = require('./BaseService');
const AuditLogService = require('./AuditLogService');
const { MenuItem } = require('../models');
const { moduleLabel } = require('../utils/auditDescribe');

class MenuService extends BaseService {
  constructor() {
    super(MenuRepository);
  }

  // Override update to handle nested items if they are passed
  async updateMenuWithItems(id, data) {
    const { items, ...menuData } = data;
    const menu = await this.update(id, menuData);

    if (items && Array.isArray(items)) {
      const previousItems = await MenuItem.findAll({ where: { menuId: id }, order: [['displayOrder', 'ASC']] });

      // Very basic approach: wipe old items, create new ones.
      // A more robust approach would compute diffs, but this is simpler for nested structures
      await MenuItemRepository.deleteByMenuId(id);
      
      const createItemsRecursive = async (menuItems, parentId = null) => {
        for (let i = 0; i < menuItems.length; i++) {
          const item = menuItems[i];
          const created = await MenuItemRepository.create({
            menuId: id,
            parentId,
            title: item.title,
            url: item.url,
            target: item.target || '_self',
            icon: String(item.icon || '').trim().slice(0, 500) || null,
            displayOrder: i
          });
          if (item.children && item.children.length > 0) {
            await createItemsRecursive(item.children, created.id);
          }
        }
      };

      await createItemsRecursive(items);
      await this._auditItemChanges(menu, previousItems, items);
    }
    
    // Return updated menu with items
    return await this.getById(id);
  }

  async _auditItemChanges(menu, previousItems, newTree) {
    const flatten = (list) => list.flatMap(item => [
      { title: item.title, url: item.url, icon: item.icon || null },
      ...flatten(item.children || [])
    ]);
    const before = previousItems.map(i => ({ title: i.title, url: i.url, icon: i.icon || null }));
    const after = flatten(newTree);
    const key = (i) => `${i.title}|${i.url}`;
    const iconKey = (i) => `${key(i)}|${i.icon || ''}`;

    const changes = [];
    const added = after.filter(i => !before.some(b => key(b) === key(i)));
    const removed = before.filter(b => !after.some(i => key(i) === key(b)));
    if (added.length) changes.push(`added ${added.map(i => `"${i.title}"`).join(', ')}`);
    if (removed.length) changes.push(`removed ${removed.map(i => `"${i.title}"`).join(', ')}`);
    if (changes.length === 0 && JSON.stringify(before.map(key)) !== JSON.stringify(after.map(key))) {
      changes.push('reordered items');
    }
    if (changes.length === 0 && JSON.stringify(before.map(iconKey)) !== JSON.stringify(after.map(iconKey))) {
      changes.push('changed icons');
    }
    if (changes.length === 0) return;

    await AuditLogService.record({
      action: 'UPDATE',
      module: moduleLabel('Menu'),
      recordId: menu.id,
      description: `Updated menu "${menu.name}" items: ${changes.join('; ')}`,
      oldData: { items: before },
      newData: { items: after }
    });
  }
}

module.exports = new MenuService();
