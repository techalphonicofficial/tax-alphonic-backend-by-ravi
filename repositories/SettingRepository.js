const { Setting } = require('../models');

class SettingRepository {
    async findByGroup(group) {
        return await Setting.findAll({
            where: { group }
        });
    }

    async upsert(group, key, value, type = 'string', isPublic = false) {
        const [setting, created] = await Setting.findOrCreate({
            where: { group, key },
            defaults: { value, type, isPublic }
        });

        if (!created) {
            await setting.update({ value, type, isPublic });
        }
        return setting;
    }

    async getSettingsObject(group) {
        const settings = await this.findByGroup(group);
        const result = {};
        for (const s of settings) {
            let val = s.value;
            if (s.type === 'boolean') val = val === 'true';
            if (s.type === 'number') val = Number(val);
            if (s.type === 'json') {
                try {
                    val = JSON.parse(val);
                } catch(e) { }
            }
            result[s.key] = val;
        }
        return result;
    }
}

module.exports = new SettingRepository();
