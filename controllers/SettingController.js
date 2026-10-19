const settingRepository = require('../repositories/SettingRepository');
const AuditLogService = require('../services/AuditLogService');
const { logger } = require('../config/logger');
const { moduleLabel, redact } = require('../utils/auditDescribe');

class SettingController {
    async getGroupSettings(req, res) {
        try {
            const { group } = req.params;
            const settings = await settingRepository.getSettingsObject(group);
            res.json({ success: true, data: settings });
        } catch (error) {
            logger.error(`Error fetching settings: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
        }
    }

    async updateGroupSettings(req, res) {
        try {
            const { group } = req.params;
            const settingsData = req.body;
            const previousSettings = await settingRepository.getSettingsObject(group);

            const promises = [];
            for (const key in settingsData) {
                let value = settingsData[key];
                let type = 'string';

                if (typeof value === 'boolean') {
                    type = 'boolean';
                    value = value.toString();
                } else if (typeof value === 'number') {
                    type = 'number';
                    value = value.toString();
                } else if (typeof value === 'object') {
                    type = 'json';
                    value = JSON.stringify(value);
                }

                promises.push(settingRepository.upsert(group, key, value, type, false));
            }

            await Promise.all(promises);

            const updatedSettings = await settingRepository.getSettingsObject(group);
            await auditSettingChanges(group, previousSettings, updatedSettings);
            res.json({ success: true, data: updatedSettings, message: 'Settings updated successfully' });
        } catch (error) {
            logger.error(`Error updating settings: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
        }
    }
}

// One audit entry per settings group save, listing only the keys that changed.
// (Module-level: routes pass the controller methods unbound.)
const auditSettingChanges = async (group, before, after) => {
    const changedKeys = Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (changedKeys.length === 0) return;

    const oldData = {};
    const newData = {};
    changedKeys.forEach(key => {
        oldData[key] = before[key] === undefined ? null : before[key];
        newData[key] = after[key];
    });

    await AuditLogService.record({
        action: 'UPDATE',
        module: moduleLabel('Setting'),
        recordId: group,
        description: `Updated ${group} settings: ${changedKeys.join(', ')}`,
        oldData: redact(oldData),
        newData: redact(newData)
    });
};

module.exports = new SettingController();
