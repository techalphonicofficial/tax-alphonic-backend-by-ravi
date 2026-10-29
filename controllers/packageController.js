const PackageRepository = require('../repositories/PackageRepository');
const PackageService = require('../services/PackageService');
const { Op } = require('sequelize');

class PackageController {
    async create(req, res, next) {
        try {
            const pkg = await PackageRepository.create(req.body);
            res.status(201).json({ success: true, data: pkg });
        } catch (error) {
            next(error);
        }
    }

    async getCategories(req, res, next) {
        try {
            // Group by category to get unique categories
            const categories = await PackageRepository.model.findAll({
                attributes: ['category'],
                group: ['category'],
                where: { category: { [Op.ne]: null } }
            });
            res.status(200).json({
                success: true,
                data: categories.map(c => c.category)
            });
        } catch (error) {
            next(error);
        }
    }

    async renameCategory(req, res, next) {
        try {
            const { oldName, newName } = req.body;
            if (!oldName || !newName) {
                return res.status(400).json({ success: false, message: 'oldName and newName are required' });
            }
            await PackageRepository.model.update(
                { category: newName },
                { where: { category: oldName } }
            );
            res.status(200).json({ success: true, message: 'Category renamed successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 50, name_like, category, status, sortBy, sortOrder } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (name_like) {
                where.name = { [Op.like]: `%${name_like}%` };
            }
            if (category) {
                // Support clean slug URLs by finding the actual category name
                const allCategories = await PackageRepository.model.findAll({
                    attributes: ['category'],
                    group: ['category'],
                    where: { category: { [Op.ne]: null } }
                });
                const exactMatch = allCategories.find(c => c.category === category);
                if (exactMatch) {
                    where.category = exactMatch.category;
                } else {
                    const slugMatch = allCategories.find(c => 
                        c.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
                    );
                    if (slugMatch) {
                        where.category = slugMatch.category;
                    } else {
                        where.category = category;
                    }
                }
            }
            if (status) {
                where.status = status;
            }

            let order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']];
            if (sortBy) {
                order = [[sortBy, sortOrder || 'ASC']];
            }

            const result = await PackageRepository.findAndCountAll({ where, offset, limit: parseInt(limit), order });
            res.status(200).json({
                success: true,
                data: result.rows,
                pagination: {
                    totalItems: result.count,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(result.count / limit),
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const pkg = await PackageRepository.findById(req.params.id);
            if (!pkg) {
                return res.status(404).json({ success: false, message: 'Package not found' });
            }
            const usages = await PackageService.findUsages(pkg.id);
            // includedServices resolved (title / note / url) for the admin Live Preview; the admin
            // form edits the raw list in features.includedServices.
            const [withServices] = await PackageService.withIncludedServices([pkg]);
            res.status(200).json({ success: true, data: { ...withServices, usages } });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const updated = await PackageRepository.update(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Package not found' });
            }
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const force = ['true', '1'].includes(String(req.query.force));
            if (!force) {
                const usages = await PackageService.findUsages(req.params.id);
                if (usages.length > 0) {
                    const where = usages.map(u => `${u.type}: ${u.title}`).join(', ');
                    return res.status(409).json({
                        success: false,
                        message: `This package is attached to ${usages.length} item(s) (${where}). Remove it from them first, or delete with force=true.`,
                        errors: usages
                    });
                }
            }
            const deleted = await PackageRepository.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Package not found' });
            }
            res.status(200).json({ success: true, message: 'Package deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PackageController();
