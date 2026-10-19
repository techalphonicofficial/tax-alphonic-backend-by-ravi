const AboutPageRepository = require('../repositories/AboutPageRepository');
// Files uploaded with the form go to the active media storage (Media → Media Settings).
const StorageService = require('../services/storage/StorageService');

class AboutPageController {
  async getSettings(req, res) {
    try {
      const data = await AboutPageRepository.getSettings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error fetching about page settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async updateSettings(req, res) {
    try {
      // Parse JSON fields if they come as strings
      if (typeof req.body.coreValues === 'string') {
        try { req.body.coreValues = JSON.parse(req.body.coreValues); } catch(e){}
      }
      if (typeof req.body.historyTimeline === 'string') {
        try { req.body.historyTimeline = JSON.parse(req.body.historyTimeline); } catch(e){}
      }

      if (req.files) {
        if (req.files.aboutImage && req.files.aboutImage.length > 0) {
          req.body.aboutImage = await StorageService.storeDiskUpload(req.files.aboutImage[0]);
        }
        if (req.files.homeAboutImage && req.files.homeAboutImage.length > 0) {
          req.body.homeAboutImage = await StorageService.storeDiskUpload(req.files.homeAboutImage[0]);
        }
      }

      const data = await AboutPageRepository.updateSettings(req.body);
      res.status(200).json({ success: true, message: 'About page updated successfully', data });
    } catch (error) {
      console.error('Error updating about page settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new AboutPageController();
