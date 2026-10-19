const { Banner } = require('../models');

class BannerRepository {
    async create(data) {
        return await Banner.create(data);
    }

    async findAll(options = {}) {
        const { offset = 0, limit = 50, where = {}, order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']] } = options;
        return await Banner.findAndCountAll({
            where,
            offset,
            limit,
            order
        });
    }

    async findById(id) {
        return await Banner.findByPk(id);
    }

    async update(id, data) {
        const banner = await Banner.findByPk(id);
        if (!banner) return null;
        
        return await banner.update(data);
    }

    async delete(id) {
        const banner = await Banner.findByPk(id);
        if (!banner) return false;
        
        await banner.destroy();
        return true;
    }
}

module.exports = new BannerRepository();
