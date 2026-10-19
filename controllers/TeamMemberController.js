const TeamMemberRepository = require('../repositories/TeamMemberRepository');
// Files uploaded with the form go to the active media storage (Media → Media Settings).
const StorageService = require('../services/storage/StorageService');
const { Op } = require('sequelize');

class TeamMemberController {
    async create(req, res, next) {
        try {
            const data = { ...req.body };
            if (data.socialLinks && typeof data.socialLinks === 'string') {
                data.socialLinks = JSON.parse(data.socialLinks);
            }
            if (req.file) {
                data.imageUrl = await StorageService.storeDiskUpload(req.file);
            }

            const teamMember = await TeamMemberRepository.create(data);
            res.status(201).json({ success: true, data: teamMember });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 50, name_like, status, sortBy, sortOrder } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (name_like) {
                where.name = { [Op.like]: `%${name_like}%` };
            }
            if (status) {
                where.status = status;
            }

            let order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']];
            if (sortBy) {
                order = [[sortBy, sortOrder || 'ASC']];
            }

            const result = await TeamMemberRepository.findAll({ where, offset, limit: parseInt(limit), order });
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
            const teamMember = await TeamMemberRepository.findById(req.params.id);
            if (!teamMember) {
                return res.status(404).json({ success: false, message: 'Team member not found' });
            }
            res.status(200).json({ success: true, data: teamMember });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const data = { ...req.body };
            if (data.socialLinks && typeof data.socialLinks === 'string') {
                data.socialLinks = JSON.parse(data.socialLinks);
            }
            if (req.file) {
                data.imageUrl = await StorageService.storeDiskUpload(req.file);
            }

            const updated = await TeamMemberRepository.update(req.params.id, data);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Team member not found' });
            }

            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deleted = await TeamMemberRepository.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Team member not found' });
            }
            res.status(200).json({ success: true, message: 'Team member deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TeamMemberController();
