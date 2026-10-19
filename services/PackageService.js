const { Package } = require('../models');
const { findSectionUsages } = require('../utils/sectionUsages');

// Page Builder block type that embeds packages (see cms-admin PageBuilder AVAILABLE_BLOCKS)
const PACKAGES_BLOCK_TYPE = 'Packages';

class PackageService {
  // Every page, service and blog whose Page Builder sections reference this package
  async findUsages(packageId) {
    return findSectionUsages(packageId);
  }

  toPublic(pkg) {
    const { id, name, description, isRecommended, category, keywordTiers, features, pricingPlans, displayOrder } =
      pkg.toJSON ? pkg.toJSON() : pkg;
    return { id, name, description, isRecommended, category, keywordTiers, features, pricingPlans, displayOrder };
  }

  // ---------------------------------------------------------------------------
  // Page Builder integration: attach the public package definitions to Packages blocks.
  // Only payload.packageIds is the source of truth; the resolved packages land in
  // payload.packages in the order chosen in the builder (inactive/deleted ones are dropped).
  // ---------------------------------------------------------------------------

  // sections: [{ type, data: { payload: { packageIds } } }]  (pages, blogs)
  async hydrateSections(sections) {
    if (!Array.isArray(sections)) return sections;
    const isBlock = (s) => s?.type === PACKAGES_BLOCK_TYPE;
    const packagesById = await this._loadPackages(sections.filter(isBlock).flatMap(s => s.data?.payload?.packageIds || []));
    if (!packagesById) return sections;

    return sections.map(s => (isBlock(s) ? { ...s, data: this._attach(s.data, packagesById) } : s));
  }

  // service: plain object with sections: [{ type: { componentKey }, data: { payload } }]
  // Payloads must already be parsed (FormService.hydrateServiceSections does that).
  async hydrateServiceSections(service) {
    if (!service || !Array.isArray(service.sections)) return service;
    const isBlock = (sec) => sec?.type?.componentKey === PACKAGES_BLOCK_TYPE;
    const packagesById = await this._loadPackages(
      service.sections.filter(isBlock).flatMap(sec => sec.data?.payload?.packageIds || [])
    );
    if (!packagesById) return service;

    return {
      ...service,
      sections: service.sections.map(sec => (isBlock(sec) ? { ...sec, data: this._attach(sec.data, packagesById) } : sec))
    };
  }

  _attach(data, packagesById) {
    const payload = data?.payload || {};
    const packages = (payload.packageIds || []).map(id => packagesById.get(id)).filter(Boolean);
    return { ...data, payload: { ...payload, packages } };
  }

  async _loadPackages(ids) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return null;
    const packages = await Package.findAll({ where: { id: uniqueIds, status: 'active' } });
    return new Map(packages.map(p => [p.id, this.toPublic(p)]));
  }
}

module.exports = new PackageService();
