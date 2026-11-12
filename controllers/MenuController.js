const MenuService = require('../services/MenuService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class MenuController {
  async getAll(req, res) {
    try {
      const menus = await MenuService.getAll(req.query);
      return successResponse(res, 'Menus retrieved successfully', menus);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const menu = await MenuService.getById(req.params.id);
      return successResponse(res, 'Menu retrieved successfully', menu);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async create(req, res) {
    try {
      // Create menu first
      const menu = await MenuService.create(req.body);

      // If items are passed during creation, update with items
      if (req.body.items && Array.isArray(req.body.items)) {
        const updatedMenu = await MenuService.updateMenuWithItems(menu.id, req.body);
        return successResponse(res, 'Menu created successfully', updatedMenu, null, 201);
      }

      return successResponse(res, 'Menu created successfully', menu, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const menu = await MenuService.updateMenuWithItems(req.params.id, req.body);
      return successResponse(res, 'Menu updated successfully', menu);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await MenuService.delete(req.params.id);
      return successResponse(res, 'Menu deleted successfully', null);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async linkItem(req, res) {
    try {
      const { MenuItem, Menu } = require('../models');
      const { mode = 'link_existing', menuItemId, menuId, parentId, title, url } = req.body;

      if (!url) {
        return errorResponse(res, 'URL is required to link with menu item', [], 400);
      }

      if (mode === 'link_existing') {
        if (!menuItemId) {
          return errorResponse(res, 'menuItemId is required for linking to existing item', [], 400);
        }
        const item = await MenuItem.findByPk(menuItemId);
        if (!item) {
          return errorResponse(res, 'Menu item not found', [], 404);
        }
        // The item already leads to another page: only replaced when the editor confirmed it.
        const bareUrl = (value) => String(value || '').trim().replace(/\/+$/, '').toLowerCase();
        const same = (a, b) => bareUrl(a) === bareUrl(b);
        const current = String(item.url || '').trim();
        if (current && current !== '#' && !same(current, url) && !req.body.confirmReplace) {
          return errorResponse(res, `The menu item "${item.title}" already links to ${current}. Linking it here replaces that link.`, [{ code: 'MENU_ITEM_LINKED', url: current, title: item.title }], 409);
        }
        item.url = url;
        if (title) item.title = title;
        await item.save();
        return successResponse(res, 'Menu item updated and linked successfully', item);
      }

      if (mode === 'add_new') {
        if (!menuId) {
          return errorResponse(res, 'menuId is required to add new item', [], 400);
        }
        const menu = await Menu.findByPk(menuId);
        if (!menu) {
          return errorResponse(res, 'Target menu not found', [], 404);
        }

        // The same link twice in one menu would show the page twice in the header / footer.
        const { Op } = require('sequelize');
        const bare = String(url).trim().replace(/\/+$/, '');
        const existing = await MenuItem.findOne({ where: { menuId, url: { [Op.in]: [bare, `${bare}/`] } } });
        if (existing && !req.body.confirmDuplicate) {
          return errorResponse(res, `"${menu.name}" already has a link to ${bare} ("${existing.title}"). Adding it again shows it twice.`, [{ code: 'MENU_URL_EXISTS', title: existing.title }], 409);
        }

        const maxOrder = await MenuItem.max('displayOrder', {
          where: { menuId, parentId: parentId || null }
        }) || 0;

        const newItem = await MenuItem.create({
          menuId,
          parentId: parentId || null,
          title: title || 'Service',
          url,
          target: '_self',
          displayOrder: (Number(maxOrder) || 0) + 1
        });

        return successResponse(res, 'New menu item created and linked successfully', newItem, null, 201);
      }

      return errorResponse(res, 'Invalid mode specified', [], 400);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new MenuController();
