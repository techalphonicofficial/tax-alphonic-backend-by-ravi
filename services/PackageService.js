const { Package, Service } = require('../models');
const { findSectionUsages } = require('../utils/sectionUsages');

// Page Builder block type that embeds packages (see cms-admin PageBuilder AVAILABLE_BLOCKS)
const PACKAGES_BLOCK_TYPE = 'Packages';

class PackageService {
  // Every page, service and blog whose Page Builder sections reference this package
  async findUsages(packageId) {
    return findSectionUsages(packageId);
  }

  toPublic(pkg) {
    const { id, name, description, isRecommended, category, keywordTiers, features, pricingPlans, displayOrder, includedServices } =
      pkg.toJSON ? pkg.toJSON() : pkg;
    return { id, name, description, isRecommended, category, keywordTiers, features, pricingPlans, displayOrder, includedServices: includedServices || [] };
  }

  // ---------------------------------------------------------------------------
  // Bundles: a package can include several services ("Income Tax + GST + ROC management").
  // Saved by the admin in features.includedServices = [{ serviceId | null, title, label, note }]
  // (inside the features JSON, so no schema change). `title` is the service title when it was
  // picked (or the name of a custom item), `label` an optional name to show instead.
  // The website gets includedServices = [{ title, note, url }]: a published service gives its
  // current title and its link (/<slug>); a draft / deleted service or a custom item shows its
  // saved title without a link.
  // ---------------------------------------------------------------------------

  static rawIncluded(pkg) {
    const features = pkg?.features && typeof pkg.features === 'object' ? pkg.features : {};
    const items = Array.isArray(features.includedServices) ? features.includedServices : [];
    return items.filter((item) => item && (item.serviceId || item.title || item.label));
  }

  /** Plain package objects with `includedServices` resolved (one service query for all of them). */
  async withIncludedServices(packages) {
    const list = packages.map((p) => (p?.toJSON ? p.toJSON() : p));
    const ids = [...new Set(list.flatMap((p) => PackageService.rawIncluded(p).map((item) => item.serviceId)).filter(Boolean))];
    const services = ids.length
      ? await Service.findAll({ where: { id: ids, status: 'published' }, attributes: ['id', 'title', 'slug'] })
      : [];
    const byId = new Map(services.map((s) => [s.id, s]));
    return list.map((p) => ({
      ...p,
      includedServices: PackageService.rawIncluded(p)
        .map((item) => {
          const service = item.serviceId ? byId.get(item.serviceId) : null;
          return {
            title: String(item.label || service?.title || item.title || '').trim(),
            note: String(item.note || '').trim(),
            url: service?.slug ? `/${String(service.slug).replace(/^\/+/, '')}` : '',
          };
        })
        .filter((item) => item.title),
    }));
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
    const packages = await this.withIncludedServices(await Package.findAll({ where: { id: uniqueIds, status: 'active' } }));
    return new Map(packages.map(p => [p.id, this.toPublic(p)]));
  }
}

module.exports = new PackageService();
