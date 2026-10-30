const BaseService = require('./BaseService');
const { Service, ServiceSection, ServiceSectionData, SectionType } = require('../models');

const ServiceRepository = require('../repositories/ServiceRepository');
const AuditLogService = require('./AuditLogService');
const { describeSectionChanges, summarizeSections, moduleLabel } = require('../utils/auditDescribe');
const { copyFields, copyTitle, freeCopySlug } = require('./cloneRecord');

class ServiceService extends BaseService {
  constructor() {
    super(ServiceRepository);
  }

  async getBySlug(slug) {
    const service = await Service.findOne({
      where: { slug },
      include: [
        {
          model: ServiceSection,
          as: 'sections',
          include: [
            { model: ServiceSectionData, as: 'data' },
            { model: SectionType, as: 'type' }
          ]
        }
      ],
      order: [
        [{ model: ServiceSection, as: 'sections' }, 'sortOrder', 'ASC']
      ]
    });
    return service;
  }

  // Override to include sections
  async getServiceWithSections(id) {
    const service = await Service.findByPk(id, {
      include: [
        {
          model: ServiceSection,
          as: 'sections',
          include: [
            {
              model: ServiceSectionData,
              as: 'data'
            },
            {
              model: SectionType,
              as: 'type'
            }
          ]
        }
      ],
      order: [
        [{ model: ServiceSection, as: 'sections' }, 'sortOrder', 'ASC']
      ]
    });
    return service;
  }

  /**
   * A draft copy of a service with all its Page Builder blocks (services/cloneRecord.js):
   * "<title> (Copy)", slug "<slug>-copy". Returns the new service with its sections.
   */
  async clone(id) {
    const source = await this.getServiceWithSections(id);
    if (!source) {
      const err = new Error('Service not found');
      err.status = 404;
      throw err;
    }
    const plain = source.toJSON();
    const parse = (value, fallback) => {
      if (typeof value !== 'string') return value ?? fallback;
      try { return JSON.parse(value); } catch { return fallback; }
    };
    const sections = (plain.sections || []).map((sec) => ({
      sectionTypeId: sec.type?.componentKey,
      config: parse(sec.config, {}),
      data: { payload: parse(sec.data?.payload, {}) },
    })).filter((sec) => sec.sectionTypeId);

    const copy = await this.create({
      ...copyFields(plain, ['sections', 'featured']),
      title: copyTitle(plain.title),
      slug: await freeCopySlug('service', plain.slug),
      status: 'draft',
      featured: false,
    });
    try {
      if (sections.length) await this.saveServiceSections(copy.id, sections);
    } catch (error) {
      // No half copy: a service without its blocks would look like a broken clone.
      await Service.destroy({ where: { id: copy.id }, force: true });
      throw error;
    }
    return this.getServiceWithSections(copy.id);
  }

  async saveServiceSections(serviceId, sectionsPayload) {
    // Atomically save the entire nested array of sections
    // sectionsPayload = [ { sectionTypeId, sortOrder, config, data: { payload: {} } } ]
    // Snapshot the current blocks for the audit log before they are recreated
    const previousSections = await ServiceSection.findAll({
      where: { serviceId },
      include: [
        { model: ServiceSectionData, as: 'data' },
        { model: SectionType, as: 'type' }
      ],
      order: [['sortOrder', 'ASC']]
    });

    const transaction = await Service.sequelize.transaction();
    try {
      // 1. Delete existing sections (simple approach for now)
      await ServiceSection.destroy({ where: { serviceId }, transaction });

      // 2. Recreate them
      if (sectionsPayload && sectionsPayload.length > 0) {
        for (let i = 0; i < sectionsPayload.length; i++) {
          const sec = sectionsPayload[i];

          // Auto-resolve or create SectionType by componentKey
          let sectionType = await SectionType.findOne({
            where: { componentKey: sec.sectionTypeId },
            transaction
          });

          if (!sectionType) {
            sectionType = await SectionType.create({
              name: sec.sectionTypeId,
              componentKey: sec.sectionTypeId,
              category: 'Content',
              isActive: true
            }, { transaction });
          }

          const newSection = await ServiceSection.create({
            serviceId,
            sectionTypeId: sectionType.id,
            sortOrder: i,
            config: sec.config || {}
          }, { transaction });

          if (sec.data && sec.data.payload) {
            await ServiceSectionData.create({
              serviceSectionId: newSection.id,
              payload: sec.data.payload
            }, { transaction });
          }
        }
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await this._auditSectionChanges(serviceId, previousSections, sectionsPayload || []);
    return true;
  }

  async _auditSectionChanges(serviceId, previousSections, sectionsPayload) {
    const oldSections = previousSections.map(sec => sec.toJSON());
    const newSections = sectionsPayload.map(sec => ({ type: sec.sectionTypeId, data: sec.data }));
    const changes = describeSectionChanges(oldSections, newSections);
    if (changes.length === 0) return;

    const service = await Service.findByPk(serviceId, { attributes: ['id', 'title'] });
    await AuditLogService.record({
      action: 'UPDATE',
      module: moduleLabel('Service'),
      recordId: serviceId,
      description: `Updated service${service ? ` "${service.title}"` : ''}: page builder (${changes.join(', ')})`,
      oldData: { sections: summarizeSections(oldSections) },
      newData: { sections: summarizeSections(newSections) }
    });
  }
}

module.exports = new ServiceService();
