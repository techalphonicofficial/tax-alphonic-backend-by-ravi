const SeoPageService = require('../services/SeoPageService');
const SectionHydrator = require('../services/SectionHydrator');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../config/logger');

class SeoPageController {
  async create(req, res) {
    try {
      const { Seopage: SeoPage } = require('../models');
      const { Op } = require('sequelize');
      const { slug, serviceId, locationId, industryId, technologyId, problemId } = req.body;

      const duplicateConditions = [];
      if (slug) duplicateConditions.push({ slug: String(slug).trim().toLowerCase() });
      if (serviceId && locationId) duplicateConditions.push({ serviceId, locationId });
      if (serviceId && industryId) duplicateConditions.push({ serviceId, industryId });
      if (serviceId && technologyId) duplicateConditions.push({ serviceId, technologyId });
      if (problemId) duplicateConditions.push({ problemId });

      if (duplicateConditions.length > 0) {
        const existing = await SeoPage.findOne({
          where: { [Op.or]: duplicateConditions }
        });
        if (existing) {
          return errorResponse(res, `A page already exists for this combination or slug ('${existing.slug}').`, [], 409);
        }
      }

      const item = await SeoPageService.create(req.body);
      return successResponse(res, 'SeoPage created successfully', item, null, 201);
    } catch (error) {
      logger.error(`Create SeoPage Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await SeoPageService.getAll(req.query);
      return successResponse(res, 'SeoPage retrieved successfully', result.data, result.pagination);
    } catch (error) {
      logger.error(`Get SeoPage Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  /** GET /seo-pages/combos → every page as { id, slug, serviceId, locationId, industryId, technologyId, problemId, status }
   *  (no content), so the admin Matrix Combinator can mark existing combinations without loading every page body. */
  async getCombos(req, res) {
    try {
      const { Seopage: SeoPage } = require('../models');
      const rows = await SeoPage.findAll({
        attributes: ['id', 'slug', 'serviceId', 'locationId', 'industryId', 'technologyId', 'problemId', 'status'],
        raw: true,
      });
      return successResponse(res, 'SeoPage combinations retrieved', rows);
    } catch (error) {
      logger.error(`Get SeoPage combos Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  /**
   * GET /seo-pages/admin-list?page=&limit=&search=&status=&pageType=&ai=&serviceId=&live=&sortBy=&sortOrder=
   * Admin list without the page bodies: dimension names, hasContent / contentLength, and `counts`
   * (status, AI, live) for the summary cards. live=1 → published with content (what the website shows).
   */
  async adminList(req, res) {
    try {
      const { Seopage: SeoPage, Service, Location, Industry, Technology, Problem, sequelize } = require('../models');
      const { Op } = require('sequelize');
      const q = req.query;
      const page = Math.max(1, parseInt(q.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(q.limit, 10) || 50));
      const SORTABLE = ['title', 'slug', 'status', 'pageType', 'aiGenerationStatus', 'qualityScore', 'updatedAt', 'createdAt', 'publishedAt'];
      const sortBy = SORTABLE.includes(q.sortBy) ? q.sortBy : 'updatedAt';
      const sortOrder = String(q.sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const hasContent = sequelize.literal("(`Seopage`.`longDescription` IS NOT NULL AND `Seopage`.`longDescription` <> '')");

      const and = [];
      if (q.search) {
        const term = `%${String(q.search).trim()}%`;
        and.push({ [Op.or]: [{ title: { [Op.like]: term } }, { slug: { [Op.like]: term } }] });
      }
      if (['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(q.status)) and.push({ status: q.status });
      if (q.pageType) and.push({ pageType: q.pageType });
      if (q.ai === 'GENERATED') and.push({ aiGenerationStatus: 'GENERATED' });
      if (q.ai === 'NOT_GENERATED') and.push({ aiGenerationStatus: { [Op.ne]: 'GENERATED' } });
      if (q.serviceId) and.push({ serviceId: q.serviceId });
      if (q.live === '1') and.push({ status: 'PUBLISHED' }, hasContent);
      if (q.noContent === '1') and.push(sequelize.literal("(`Seopage`.`longDescription` IS NULL OR `Seopage`.`longDescription` = '')"));
      const where = and.length ? { [Op.and]: and } : {};

      const name = (model, as, attrs = ['id', 'name']) => ({ model, as, attributes: attrs, required: false, paranoid: false });
      const [{ rows, count }, statusRows, aiRows, liveCount] = await Promise.all([
        SeoPage.findAndCountAll({
          where,
          attributes: {
            exclude: ['longDescription'],
            include: [[hasContent, 'hasContent'], [sequelize.fn('LENGTH', sequelize.col('Seopage.longDescription')), 'contentLength']],
          },
          include: [name(Service, 'service', ['id', 'title', 'slug']), name(Location, 'location'), name(Industry, 'industry'), name(Technology, 'technology'), name(Problem, 'problem')],
          order: [[sortBy, sortOrder]],
          offset: (page - 1) * limit,
          limit,
          distinct: true,
        }),
        SeoPage.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['status'], raw: true }),
        SeoPage.findAll({ attributes: ['aiGenerationStatus', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['aiGenerationStatus'], raw: true }),
        SeoPage.count({ where: { [Op.and]: [{ status: 'PUBLISHED' }, hasContent] } }),
      ]);

      const counts = { total: 0, PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0, generated: 0, pending: 0, live: liveCount };
      statusRows.forEach((r) => { counts[r.status] = Number(r.n); counts.total += Number(r.n); });
      aiRows.forEach((r) => { if (r.aiGenerationStatus === 'GENERATED') counts.generated += Number(r.n); else counts.pending += Number(r.n); });

      return res.status(200).json({
        success: true,
        message: 'SEO pages retrieved',
        data: rows.map((r) => {
          const row = r.toJSON();
          return { ...row, hasContent: Boolean(Number(row.hasContent)), contentLength: Number(row.contentLength) || 0 };
        }),
        counts,
        pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page, itemsPerPage: limit },
      });
    } catch (error) {
      logger.error(`SeoPage admin list Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  /** POST /seo-pages/bulk-status { ids[], status?, indexable? } → publish / unpublish / archive many pages. */
  async bulkStatus(req, res) {
    try {
      const { Seopage: SeoPage } = require('../models');
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean).slice(0, 1000) : [];
      const { status, indexable } = req.body || {};
      if (!ids.length) return errorResponse(res, 'No pages selected', [{ field: 'ids', message: 'Select at least one page' }], 422);
      if (status !== undefined && !['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(status)) {
        return errorResponse(res, 'Invalid status', [{ field: 'status', message: 'Use PUBLISHED, DRAFT or ARCHIVED' }], 422);
      }
      const pages = await SeoPage.findAll({ where: { id: ids } });
      let updated = 0;
      let skippedEmpty = 0;
      for (const p of pages) {
        const patch = {};
        if (status) {
          // A page without content would not show on the website: don't publish it.
          if (status === 'PUBLISHED' && !p.longDescription) { skippedEmpty += 1; continue; }
          patch.status = status;
          if (status === 'PUBLISHED' && !p.publishedAt) patch.publishedAt = new Date();
        }
        if (typeof indexable === 'boolean') patch.indexable = indexable;
        if (Object.keys(patch).length) {
          await p.update(patch);
          updated += 1;
        }
      }
      const note = skippedEmpty ? ` ${skippedEmpty} page${skippedEmpty === 1 ? '' : 's'} without content ${skippedEmpty === 1 ? 'was' : 'were'} not published.` : '';
      return successResponse(res, `Updated ${updated} page${updated === 1 ? '' : 's'}.${note}`, { updated, skippedEmpty });
    } catch (error) {
      logger.error(`SeoPage bulk status Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const item = await SeoPageService.getById(req.params.id);
      return successResponse(res, 'SeoPage retrieved successfully', item);
    } catch (error) {
      logger.error(`Get SeoPage Error: ${error.message}`);
      return errorResponse(res, error.message, [], 404);
    }
  }

  async getBySlug(req, res) {
    try {
      // Public lookup by the page's full path (e.g. /lookup?path=india/seo-services-noida).
      // Only PUBLISHED pages with content are served: DRAFT / ARCHIVED stay hidden from the website.
      const fullSlug = String(req.query.path || req.params.slug || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
      if (!fullSlug) return errorResponse(res, 'Page not found', [], 404);

      const { Seopage: SeoPage, Service, ServiceSection, ServiceSectionData, SectionType, Location, State, Country, Industry, Technology, Problem } = require('../models');
      const { Op } = require('sequelize');

      const whereClause = {
        slug: fullSlug,
        status: 'PUBLISHED',
        longDescription: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
      };

      const item = await SeoPage.findOne({
        where: whereClause,
        include: [
          {
            model: Service,
            as: 'service',
            include: [
              {
                model: ServiceSection,
                as: 'sections',
                include: [
                  { model: ServiceSectionData, as: 'data' },
                  { model: SectionType, as: 'type' }
                ]
              }
            ]
          },
          {
            model: Location,
            as: 'location',
            include: [
              { model: State, as: 'stateMaster', attributes: ['id', 'name'] },
              { model: Country, as: 'countryMaster', attributes: ['id', 'name'] }
            ]
          },
          { model: Industry, as: 'industry' },
          { model: Technology, as: 'technology' },
          { model: Problem, as: 'problem' }
        ],
        order: [
          [{ model: Service, as: 'service' }, { model: ServiceSection, as: 'sections' }, 'sortOrder', 'ASC']
        ]
      });

      // A switched-off location hides its pages too.
      if (!item || (item.locationId && item.location?.active === false)) {
        return errorResponse(res, 'Page not found or content not yet generated', [], 404);
      }
      const data = item.toJSON();
      data.service = await SectionHydrator.hydrateServiceSections(data.service);
      return successResponse(res, 'SeoPage mapping retrieved', data);
    } catch (error) {
      logger.error(`Get SeoPage by slug Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async getRelated(req, res) {
    try {
      const fullSlug = req.query.path;
      if (!fullSlug) return successResponse(res, 'No related available', []);

      const { Seopage: SeoPage } = require('../models');
      const { Op } = require('sequelize');

      const current = await SeoPage.findOne({ where: { slug: fullSlug } });
      if (!current) return successResponse(res, 'No related available', []);

      // Build semantic cluster (same service, or same location/industry/tech/problem)
      const orConditions = [];
      if (current.serviceId) orConditions.push({ serviceId: current.serviceId });
      if (current.locationId) orConditions.push({ locationId: current.locationId });
      if (current.industryId) orConditions.push({ industryId: current.industryId });
      if (current.technologyId) orConditions.push({ technologyId: current.technologyId });
      if (current.problemId) orConditions.push({ problemId: current.problemId });

      let related = [];
      if (orConditions.length > 0) {
        related = await SeoPage.findAll({
          where: {
            id: { [Op.ne]: current.id },
            status: 'PUBLISHED',
            longDescription: {
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.ne]: '' }
              ]
            },
            [Op.or]: orConditions
          },
          attributes: ['title', 'slug', 'pageType', 'metaDescription'],
          limit: 6,
          order: [['updatedAt', 'DESC']]
        });
      }

      return successResponse(res, 'Related semantic links fetched', related);
    } catch (error) {
      logger.error(`Get Related Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async bulkGenerate(req, res) {
    try {
      const { serviceId, locationIds = [], industryIds = [], technologyIds = [], problemIds = [] } = req.body;
      const { Service, Location, Industry, Technology, Problem, Seopage: SeoPage } = require('../models');
      const { Op } = require('sequelize');

      const makeSlug = (str) => {
        if (!str) return '';
        return String(str)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      };

      if (!serviceId && problemIds.length === 0) {
        return errorResponse(res, 'Must provide at least a Service or Problem definitions to base generation upon.');
      }

      let baseService = null;
      if (serviceId) {
        baseService = await Service.findByPk(serviceId);
        if (!baseService) {
          return errorResponse(res, 'Selected base service not found.', [], 404);
        }
      }

      // Input deduplication (clean invalid/duplicate values)
      const cleanLocIds = [...new Set(Array.isArray(locationIds) ? locationIds.filter(Boolean) : [])];
      const cleanIndIds = [...new Set(Array.isArray(industryIds) ? industryIds.filter(Boolean) : [])];
      const cleanTechIds = [...new Set(Array.isArray(technologyIds) ? technologyIds.filter(Boolean) : [])];
      const cleanProbIds = [...new Set(Array.isArray(problemIds) ? problemIds.filter(Boolean) : [])];

      const created = [];
      const overlaps = [];

      // In-memory set to prevent duplicate generation within the same batch execution
      const processedBatchSlugs = new Set();
      const processedBatchCombos = new Set();

      // Canonical base service slug (prefer service.slug over dynamic title slugification)
      const serviceSlug = baseService ? (baseService.slug || makeSlug(baseService.title)) : '';

      // HELPER: Generate and Insert with strict duplicate combination checks
      const generateEntity = async (type, payload, comboKey, comboDescription) => {
        const normalizedSlug = payload.slug.trim().toLowerCase();
        payload.slug = normalizedSlug;

        // 1. Check in-batch tracking to prevent duplicates within the same run
        if (processedBatchSlugs.has(normalizedSlug) || (comboKey && processedBatchCombos.has(comboKey))) {
          overlaps.push({
            type,
            slug: normalizedSlug,
            description: comboDescription,
            reason: 'Duplicate in current submission batch'
          });
          return;
        }

        // 2. Multi-criteria lookup in database:
        // A combination is duplicate if EITHER:
        // - the slug is already taken
        // - OR the combination of entity IDs already exists on /seo-pages
        const orConditions = [{ slug: normalizedSlug }];
        if (payload.serviceId && payload.locationId) {
          orConditions.push({ serviceId: payload.serviceId, locationId: payload.locationId });
        }
        if (payload.serviceId && payload.industryId) {
          orConditions.push({ serviceId: payload.serviceId, industryId: payload.industryId });
        }
        if (payload.serviceId && payload.technologyId) {
          orConditions.push({ serviceId: payload.serviceId, technologyId: payload.technologyId });
        }
        if (payload.problemId) {
          orConditions.push({ problemId: payload.problemId });
        }

        const ext = await SeoPage.findOne({
          where: { [Op.or]: orConditions }
        });

        if (ext) {
          const reason = ext.slug === normalizedSlug
            ? `Slug '${normalizedSlug}' already exists on /seo-pages`
            : `Combination already mapped to existing page '${ext.slug}'`;
          overlaps.push({
            type,
            slug: normalizedSlug,
            description: comboDescription,
            existingSlug: ext.slug,
            reason
          });
          return;
        }

        // Passed all uniqueness checks -> create page
        const item = await SeoPage.create({
          status: 'DRAFT',
          indexable: false,
          contentSource: 'MANUAL',
          aiGenerationStatus: 'NOT_GENERATED',
          qualityScore: 0,
          ...payload
        });

        processedBatchSlugs.add(normalizedSlug);
        if (comboKey) processedBatchCombos.add(comboKey);
        created.push(item);
      };

      let locs = [];
      if (cleanLocIds.length > 0) {
        locs = await Location.findAll({
          where: { id: cleanLocIds },
          include: ['countryMaster']
        });
      }

      // 1. Service + Location combinations
      if (baseService && locs.length > 0) {
        for (const loc of locs) {
          const locSlug = loc.slug || makeSlug(loc.name);
          const countrySlug = loc.countryMaster ? (loc.countryMaster.slug || makeSlug(loc.countryMaster.name)) : 'global';
          const comboKey = `loc_${baseService.id}_${loc.id}`;
          await generateEntity('SERVICE_LOCATION', {
            slug: `${countrySlug}/${serviceSlug}-${locSlug}`,
            pageType: 'SERVICE_LOCATION',
            title: `${baseService.title} in ${loc.name}`,
            serviceId: baseService.id,
            locationId: loc.id
          }, comboKey, `${baseService.title} + ${loc.name}`);
        }
      }

      // 2. Service + Industry combinations
      if (baseService && cleanIndIds.length > 0) {
        const inds = await Industry.findAll({ where: { id: cleanIndIds } });
        for (const ind of inds) {
          const indSlug = ind.slug || makeSlug(ind.name);
          const comboKey = `srv_${baseService.id}_ind_${ind.id}`;
          
          const payload = {
            slug: `${serviceSlug}-for-${indSlug}`,
            pageType: 'SERVICE_INDUSTRY',
            title: `${baseService.title} for ${ind.name}`,
            serviceId: baseService.id,
            industryId: ind.id
          };

          await generateEntity('SERVICE_INDUSTRY', payload, comboKey, `${baseService.title} + ${ind.name}`);
        }
      }

      // 3. Service + Technology combinations
      if (baseService && cleanTechIds.length > 0) {
        const techs = await Technology.findAll({ where: { id: cleanTechIds } });
        for (const tech of techs) {
          const techSlug = tech.slug || makeSlug(tech.name);
          const comboKey = `srv_${baseService.id}_tech_${tech.id}`;
          
          const payload = {
            slug: `${techSlug}-${serviceSlug}`,
            pageType: 'SERVICE_TECHNOLOGY',
            title: `${tech.name} ${baseService.title}`,
            serviceId: baseService.id,
            technologyId: tech.id
          };

          await generateEntity('SERVICE_TECHNOLOGY', payload, comboKey, `${tech.name} + ${baseService.title}`);
        }
      }

      // 4. Problem alone
      if (cleanProbIds.length > 0) {
        const probs = await Problem.findAll({ where: { id: cleanProbIds } });
        for (const prob of probs) {
          const probSlug = prob.slug || makeSlug(prob.name);
          const comboKey = `prob_${prob.id}`;
          await generateEntity('PROBLEM', {
            slug: `${probSlug}`,
            pageType: 'PROBLEM',
            title: `${prob.name}`,
            problemId: prob.id
          }, comboKey, `Problem: ${prob.name}`);
        }
      }

      return successResponse(
        res,
        `Bulk execution finished.`,
        {
          created: created.length,
          overlaps: overlaps.length,
          overlapSlugs: overlaps.map(o => o.slug),
          overlapDetails: overlaps
        },
        null,
        201
      );
    } catch (error) {
      logger.error(`Bulk Generate Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getAiConfig(req, res) {
    try {
      const AiGenerationService = require('../services/AiGenerationService');
      const config = await AiGenerationService.getConfig();
      return successResponse(res, 'AI configuration options retrieved', config);
    } catch (error) {
      logger.error(`Get AI Config Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async triggerGenai(req, res) {
    try {
      const { id } = req.params;
      const { wordCount, wordCountTier, sections, tone, updateMetadata = true } = req.body || {};
      const { Seopage: SeoPage } = require('../models');
      const AiGenerationService = require('../services/AiGenerationService');

      const item = await SeoPage.findByPk(id, {
        include: ['service', 'location', 'industry', 'technology', 'problem']
      });

      if (!item) return errorResponse(res, 'Matrix Page not found', [], 404);

      const generated = await AiGenerationService.generateContentForPage(item, {
        wordCount,
        wordCountTier,
        sections,
        tone
      });

      // Mutate database object
      item.contentSource = 'AI';
      item.aiGenerationStatus = 'GENERATED';
      item.longDescription = generated.rawOutput;
      item.qualityScore = generated.qualityScore || 85;
      item.status = 'DRAFT'; // Left as DRAFT so an admin can canonicalize it structurally

      if (updateMetadata) {
        if (generated.metaTitle && (!item.metaTitle || item.metaTitle === item.title)) {
          item.metaTitle = generated.metaTitle;
        }
        if (generated.metaDescription && !item.metaDescription) {
          item.metaDescription = generated.metaDescription;
        }
      }

      await item.save();

      return successResponse(res, 'AI Matrix content generated successfully', {
        ...item.toJSON(),
        wordCount: generated.wordCount,
        sectionsGenerated: generated.sectionsGenerated,
        faqsCount: (generated.faqs || []).length
      });
    } catch (error) {
      logger.error(`AI Trigger Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async triggerBulkGenai(req, res) {
    try {
      const { Seopage: SeoPage } = require('../models');
      const AiGenerationService = require('../services/AiGenerationService');
      const { wordCount, wordCountTier, sections, tone, updateMetadata = true, limit = 5, ids } = req.body || {};
      const picked = Array.isArray(ids) ? ids.filter(Boolean) : [];

      // Restrict bulk extraction stream to prevent native Node timeouts.
      // ids given (pages picked in the admin list) → those pages, else the next drafts without content.
      const drafts = await SeoPage.findAll({
        where: picked.length ? { id: picked } : { aiGenerationStatus: 'NOT_GENERATED', status: 'DRAFT' },
        include: ['service', 'location', 'industry', 'technology', 'problem'],
        limit: Math.min(Number(limit) || 5, 20)
      });

      if (drafts.length === 0) {
        return successResponse(res, 'No pending ungenerated SEO variants detected.', { processed: 0 });
      }

      let successCount = 0;
      for (const item of drafts) {
        try {
          const generated = await AiGenerationService.generateContentForPage(item, {
            wordCount,
            wordCountTier,
            sections,
            tone
          });
          item.contentSource = 'AI';
          item.aiGenerationStatus = 'GENERATED';
          item.longDescription = generated.rawOutput;
          item.qualityScore = generated.qualityScore || 85;

          if (updateMetadata) {
            if (generated.metaTitle && (!item.metaTitle || item.metaTitle === item.title)) {
              item.metaTitle = generated.metaTitle;
            }
            if (generated.metaDescription && !item.metaDescription) {
              item.metaDescription = generated.metaDescription;
            }
          }

          await item.save();
          successCount++;
        } catch (err) {
          logger.warn(`AI Block failed on slug map ${item.slug}: ${err.message}`);
        }
      }

      return successResponse(res, `Bulk generation pass executed.`, { processed: successCount, totalAttempted: drafts.length });
    } catch (error) {
      logger.error(`AI Bulk Trigger Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async getByService(req, res) {
    try {
      const { identifier } = req.params;
      if (!identifier) {
        return errorResponse(res, 'Service identifier (id or slug) is required.', [], 400);
      }

      const { Service, Seopage: SeoPage, Location, Industry, Technology, Problem } = require('../models');
      const { Op } = require('sequelize');

      // 1. Find the base service by ID or Slug
      const service = await Service.findOne({
        where: {
          [Op.or]: [
            { id: identifier },
            { slug: identifier }
          ]
        }
      });

      if (!service) {
        return successResponse(res, 'Service not found', {
          locations: [],
          industries: [],
          technologies: [],
          problems: [],
          total: 0
        });
      }

      // 2. Fetch all published PSEO pages linked to this service (DRAFT / ARCHIVED stay hidden)
      const pages = await SeoPage.findAll({
        where: {
          serviceId: service.id,
          status: 'PUBLISHED',
          longDescription: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' }
            ]
          }
        },
        include: [
          { model: Location, as: 'location', attributes: ['id', 'name', 'slug', 'active'] },
          { model: Industry, as: 'industry', attributes: ['id', 'name', 'slug'] },
          { model: Technology, as: 'technology', attributes: ['id', 'name', 'slug'] },
          { model: Problem, as: 'problem', attributes: ['id', 'name', 'slug'] }
        ],
        attributes: ['id', 'slug', 'title', 'metaTitle', 'metaDescription', 'pageType', 'serviceId', 'locationId', 'industryId', 'technologyId', 'problemId', 'longDescription'],
        order: [['title', 'ASC']]
      });

      // 3. Filter out pages with empty/stub content (length >= 50) and pages of switched-off locations
      const validPages = pages.filter(p => p.longDescription && p.longDescription.trim().length >= 50
        && !(p.locationId && p.location?.active === false));

      // 4. Cluster into 4 distinct groups: locations, industries, technologies, problems
      const locations = [];
      const industries = [];
      const technologies = [];
      const problems = [];

      for (const p of validPages) {
        const baseItem = {
          id: p.id,
          slug: p.slug,
          title: p.title,
          metaDescription: p.metaDescription || '',
          pageType: p.pageType
        };

        if (p.location || p.locationId || p.pageType === 'SERVICE_LOCATION' || p.pageType === 'LOCATION') {
          locations.push({
            ...baseItem,
            entityName: p.location?.name || p.title.replace(new RegExp(service.title, 'gi'), '').replace(/in\s+/i, '').trim(),
            location: p.location
          });
        }
        if (p.industry || p.industryId || p.pageType === 'SERVICE_INDUSTRY' || p.pageType === 'INDUSTRY') {
          industries.push({
            ...baseItem,
            entityName: p.industry?.name || p.title.replace(new RegExp(service.title, 'gi'), '').replace(/for\s+/i, '').trim(),
            industry: p.industry
          });
        }
        if (p.technology || p.technologyId || p.pageType === 'SERVICE_TECHNOLOGY' || p.pageType === 'TECHNOLOGY') {
          technologies.push({
            ...baseItem,
            entityName: p.technology?.name || p.title.replace(new RegExp(service.title, 'gi'), '').trim(),
            technology: p.technology
          });
        }
        if (p.problem || p.problemId || p.pageType === 'SERVICE_PROBLEM' || p.pageType === 'PROBLEM') {
          problems.push({
            ...baseItem,
            entityName: p.problem?.name || p.title.replace(new RegExp(service.title, 'gi'), '').trim(),
            problem: p.problem
          });
        }
      }

      // A-Z by place name (the website's "Locations We Serve" list)
      locations.sort((a, b) => String(a.entityName).localeCompare(String(b.entityName)));

      return successResponse(res, 'Service SEO clusters retrieved', {
        locations,
        industries,
        technologies,
        problems,
        total: validPages.length
      });
    } catch (error) {
      logger.error(`Get SEO Pages by Service Error: ${error.message}`);
      return errorResponse(res, error.message, [], 500);
    }
  }

  async update(req, res) {
    try {
      const body = { ...req.body };
      // First publish stamps publishedAt (the website uses it as the page date).
      if (body.status === 'PUBLISHED' && !body.publishedAt) {
        const current = await SeoPageService.getById(req.params.id);
        if (!current.publishedAt) body.publishedAt = new Date();
      }
      const item = await SeoPageService.update(req.params.id, body);
      return successResponse(res, 'SeoPage updated successfully', item);
    } catch (error) {
      logger.error(`Update SeoPage Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      await SeoPageService.delete(req.params.id);
      return successResponse(res, 'SeoPage deleted successfully');
    } catch (error) {
      logger.error(`Delete SeoPage Error: ${error.message}`);
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new SeoPageController();
