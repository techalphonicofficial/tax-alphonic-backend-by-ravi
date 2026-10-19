const { AboutPage } = require('../models');

class AboutPageRepository {
  async getSettings() {
    // There is only one about page settings entry, we fetch the first one.
    let about = await AboutPage.findOne();
    if (!about) {
      // Create a default one if it doesn't exist
      about = await AboutPage.create({});
    }
    return about;
  }

  async updateSettings(data) {
    let about = await AboutPage.findOne();
    if (!about) {
      about = await AboutPage.create(data);
    } else {
      await about.update(data);
    }
    return about;
  }
}

module.exports = new AboutPageRepository();
