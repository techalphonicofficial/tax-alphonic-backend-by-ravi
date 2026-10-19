const BannerRepository = require('../repositories/BannerRepository');
// Files uploaded with the form go to the active media storage (Media → Media Settings).
const StorageService = require('../services/storage/StorageService');
const { Op } = require('sequelize');

class BannerController {
    async create(req, res, next) {
        try {
            const data = { ...req.body };
            if (!data.startDate) data.startDate = null;
            if (!data.endDate) data.endDate = null;
            
            if (req.files) {
                if (req.files.image) {
                    data.imageUrl = await StorageService.storeDiskUpload(req.files.image[0]);
                }
                if (req.files.mobileImage) {
                    data.mobileImageUrl = await StorageService.storeDiskUpload(req.files.mobileImage[0]);
                }
            }

            const banner = await BannerRepository.create(data);
            res.status(201).json({ success: true, data: banner });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 50, title_like, status, sortBy, sortOrder } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (title_like) {
                where.title = { [Op.like]: `%${title_like}%` };
            }
            if (status) {
                where.status = status;
            }

            let order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']];
            if (sortBy) {
                order = [[sortBy, sortOrder || 'ASC']];
            }

            const result = await BannerRepository.findAll({ where, offset, limit: parseInt(limit), order });
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
            const banner = await BannerRepository.findById(req.params.id);
            if (!banner) {
                return res.status(404).json({ success: false, message: 'Banner not found' });
            }
            res.status(200).json({ success: true, data: banner });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const data = { ...req.body };
            if (!data.startDate) data.startDate = null;
            if (!data.endDate) data.endDate = null;
            
            if (req.files) {
                if (req.files.image) {
                    data.imageUrl = await StorageService.storeDiskUpload(req.files.image[0]);
                }
                if (req.files.mobileImage) {
                    data.mobileImageUrl = await StorageService.storeDiskUpload(req.files.mobileImage[0]);
                }
            }
            if (req.body.removeMobileImage === 'true') {
                data.mobileImageUrl = null;
            }

            const updated = await BannerRepository.update(req.params.id, data);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Banner not found' });
            }

            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deleted = await BannerRepository.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Banner not found' });
            }
            res.status(200).json({ success: true, message: 'Banner deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BannerController();
