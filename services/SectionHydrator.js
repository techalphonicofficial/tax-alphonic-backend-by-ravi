const FormService = require('./FormService');
const PackageService = require('./PackageService');

// Resolves every Page Builder block that references another record (Form, Packages)
// into its live public definition for the website APIs.
const SectionHydrator = {
  // sections: [{ type, data: { payload } }]  (pages, blogs)
  async hydrateSections(sections) {
    return PackageService.hydrateSections(await FormService.hydrateSections(sections));
  },

  // service: plain object with sections: [{ type: { componentKey }, data: { payload } }]
  // FormService runs first because it also parses string payloads.
  async hydrateServiceSections(service) {
    return PackageService.hydrateServiceSections(await FormService.hydrateServiceSections(service));
  }
};

module.exports = SectionHydrator;
