const FaqRepository = require('../repositories/FaqRepository');
const { Op } = require('sequelize');

class FaqController {
    async create(req, res, next) {
        try {
            const faq = await FaqRepository.create(req.body);
            res.status(201).json({ success: true, data: faq });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 50, question_like, category, status, sortBy, sortOrder } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (question_like) {
                where.question = { [Op.like]: `%${question_like}%` };
            }
            if (category) {
                where.category = category;
            }
            if (status) {
                where.status = status;
            }

            let order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']];
            if (sortBy) {
                order = [[sortBy, sortOrder || 'ASC']];
            }

            const result = await FaqRepository.findAndCountAll({ where, offset, limit: parseInt(limit), order });
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
            const faq = await FaqRepository.findById(req.params.id);
            if (!faq) {
                return res.status(404).json({ success: false, message: 'FAQ not found' });
            }
            res.status(200).json({ success: true, data: faq });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const updated = await FaqRepository.update(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'FAQ not found' });
            }
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deleted = await FaqRepository.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'FAQ not found' });
            }
            res.status(200).json({ success: true, message: 'FAQ deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FaqController();
