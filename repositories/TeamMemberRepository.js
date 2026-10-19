const { TeamMember } = require('../models');

class TeamMemberRepository {
    async create(data) {
        return await TeamMember.create(data);
    }

    async findAll(options = {}) {
        const { offset = 0, limit = 50, where = {}, order = [['displayOrder', 'ASC'], ['createdAt', 'DESC']] } = options;
        return await TeamMember.findAndCountAll({
            where,
            offset,
            limit,
            order
        });
    }

    async findById(id) {
        return await TeamMember.findByPk(id);
    }

    async update(id, data) {
        const member = await TeamMember.findByPk(id);
        if (!member) return null;
        
        return await member.update(data);
    }

    async delete(id) {
        const member = await TeamMember.findByPk(id);
        if (!member) return false;
        
        await member.destroy();
        return true;
    }
}

module.exports = new TeamMemberRepository();
