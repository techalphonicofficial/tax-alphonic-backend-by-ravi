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
