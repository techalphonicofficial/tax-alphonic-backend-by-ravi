const { Seo } = require('../models');

class SeoRepository {
    async create(data) {
        return await Seo.create(data);
    }

    async findAll(options = {}) {
        return await Seo.findAndCountAll(options);
    }

    async findById(id) {
        return await Seo.findByPk(id);
    }

    async findOne(where, options = {}) {
        return await Seo.findOne({ where, ...options });
    }

    async findByRoute(route) {
        return await Seo.findOne({ where: { route } });
    }

    async update(id, data) {
        const item = await Seo.findByPk(id);
        if (!item) return null;
        return await item.update(data);
    }

    async delete(id) {
        const item = await Seo.findByPk(id);
        if (!item) return null;
        await item.destroy();
        return true;
    }
}

module.exports = new SeoRepository();
