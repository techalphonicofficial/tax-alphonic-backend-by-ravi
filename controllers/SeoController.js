const SeoRepository = require('../repositories/SeoRepository');
const { Op } = require('sequelize');

// SEO Configs: a detailed SEO override for one website page. The admin picks the page
// (a service, a CMS page, a pSEO page, Home / About, or a typed URL); the website asks for the
// config of the record it renders (GET /seo/lookup) and uses each non-empty field over the
// record's own SEO.

const TARGET_TYPES = ['service', 'page', 'seo_page', 'static', 'custom'];
const STATIC_TARGETS = { home: { route: '/', label: 'Homepage' }, about: { route: '/about', label: 'About page' } };
const FIELDS = [
    'route', 'metaTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'ogImage', 'otherMetaTags', 'status',
    'targetType', 'targetId', 'targetLabel', 'robots', 'ogTitle', 'ogDescription', 'twitterCard', 'schemaMarkup'
];
// What the public lookup returns.
const PUBLIC_FIELDS = [
    'id', 'route', 'targetType', 'targetId', 'metaTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'robots',
    'ogTitle', 'ogDescription', 'ogImage', 'twitterCard', 'schemaMarkup', 'otherMetaTags'
];

/** "/About-Us/" → "/about-us"; "" stays "". */
const normalizeRoute = (value) => {
    const route = String(value || '').trim().split(/[?#]/)[0].toLowerCase();
    if (!route) return '';
    const withSlash = route.startsWith('/') ? route : `/${route}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
};

const validationError = (res, errors) => res.status(422).json({ success: false, message: errors[0].message, errors });

/** The page a service / page / pSEO target points at: { route, label }, or null when it doesn't exist. */
async function resolveTarget(type, id) {
    const { Service, Page, Seopage } = require('../models');
    if (type === 'static') return STATIC_TARGETS[id] || null;
    if (type === 'service') {
        const service = await Service.findByPk(id, { attributes: ['id', 'title', 'slug'] });
        return service ? { route: normalizeRoute(service.slug), label: service.title } : null;
    }
    if (type === 'page') {
        const page = await Page.findByPk(id, { attributes: ['id', 'title', 'slug'] });
        // The CMS page "home" is the homepage itself.
        return page ? { route: page.slug === 'home' ? '/' : normalizeRoute(page.slug), label: page.title } : null;
    }
    if (type === 'seo_page') {
        const page = await Seopage.findByPk(id, { attributes: ['id', 'title', 'slug'] });
        return page ? { route: normalizeRoute(page.slug), label: page.title } : null;
    }
    return null;
}

/** Cleans and checks a create/update body. Returns { data } or { errors }. */
async function prepare(body, currentId = null) {
    const data = {};
    FIELDS.forEach((field) => {
        if (body[field] !== undefined) data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    });
    const errors = [];

    const type = data.targetType || 'custom';
    if (!TARGET_TYPES.includes(type)) errors.push({ field: 'targetType', message: 'Choose what this SEO config is for.' });
    data.targetType = type;

    if (type === 'custom') {
        data.targetId = null;
        data.route = normalizeRoute(data.route);
        if (!data.route) errors.push({ field: 'route', message: 'Enter the URL path (e.g. /contact).' });
        data.targetLabel = data.route;
    } else if (!data.targetId) {
        errors.push({ field: 'targetId', message: 'Select the page this SEO config is for.' });
    } else {
        const target = await resolveTarget(type, String(data.targetId));
        if (!target) {
            errors.push({ field: 'targetId', message: 'The selected page no longer exists.' });
        } else {
            data.targetId = String(data.targetId);
            data.route = target.route;
            data.targetLabel = target.label;
        }
    }

    if (data.schemaMarkup) {
        try {
            JSON.parse(data.schemaMarkup);
        } catch {
            errors.push({ field: 'schemaMarkup', message: 'Schema (JSON-LD) must be valid JSON.' });
        }
    }
    ['canonicalUrl', 'ogImage'].forEach((field) => {
        if (data[field] === '') data[field] = null;
    });
    if (data.status && !['active', 'inactive'].includes(data.status)) data.status = 'active';
    if (errors.length) return { errors };

    // One config per page and per URL.
    const clash = await SeoRepository.findOne({
        [Op.or]: [
            { route: data.route },
            ...(type !== 'custom' ? [{ targetType: type, targetId: data.targetId }] : [])
        ],
        ...(currentId ? { id: { [Op.ne]: currentId } } : {})
    }, { paranoid: false });
    if (clash) {
        const where = clash.deletedAt ? ' in the Trash. Restore it there (Trash → SEO Configs) or delete it forever first.' : '. Edit that one instead.';
        return { errors: [{ field: 'targetId', message: `"${clash.targetLabel || clash.route}" already has an SEO config${where}` }] };
    }

    return { data };
}

class SeoController {
    async create(req, res, next) {
        try {
            const { data, errors } = await prepare(req.body || {});
            if (errors) return validationError(res, errors);

            const seo = await SeoRepository.create(data);
            res.status(201).json({ success: true, data: seo });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 50, route_like, status, targetType, sortBy, sortOrder } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (route_like) {
                where[Op.or] = [
                    { route: { [Op.like]: `%${route_like}%` } },
                    { targetLabel: { [Op.like]: `%${route_like}%` } },
                    { metaTitle: { [Op.like]: `%${route_like}%` } }
                ];
            }
            if (status) {
                where.status = status;
            }
            if (targetType) {
                where.targetType = targetType;
            }

            let order = [['createdAt', 'DESC']];
            if (sortBy) {
                order = [[sortBy, String(sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];
            }

            const result = await SeoRepository.findAll({ where, offset, limit: parseInt(limit), order });
            res.status(200).json({
                success: true,
                data: result.rows,
                pagination: {
                    totalItems: result.count,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(result.count / limit),
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const seo = await SeoRepository.findById(req.params.id);
            if (!seo) {
                return res.status(404).json({ success: false, message: 'SEO configuration not found' });
            }
            res.status(200).json({ success: true, data: seo });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Public: the active config of a website page. ?type=service&id=<uuid> finds it by the record
     * (survives slug changes); ?route=/path is the fallback. Rows not linked to a page are ignored.
     */
    async getByRoute(req, res, next) {
        try {
            const { type, id } = req.query;
            const route = normalizeRoute(req.query.route);
            if (!route && !(type && id)) {
                return res.status(400).json({ success: false, message: 'Route or type and id are required' });
            }

            let seo = null;
            if (type && id && TARGET_TYPES.includes(type)) {
                seo = await SeoRepository.findOne({ targetType: type, targetId: String(id), status: 'active' });
            }
            if (!seo && route) {
                seo = await SeoRepository.findOne({ route, status: 'active', targetType: { [Op.ne]: null } });
            }
            if (!seo) {
                return res.status(404).json({ success: false, message: 'SEO configuration not found' });
            }

            const json = seo.toJSON();
            res.status(200).json({ success: true, data: Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, json[field] ?? null])) });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const current = await SeoRepository.findById(req.params.id);
            if (!current) {
                return res.status(404).json({ success: false, message: 'SEO configuration not found' });
            }

            const { data, errors } = await prepare({ ...current.toJSON(), ...(req.body || {}) }, current.id);
            if (errors) return validationError(res, errors);

            const updated = await SeoRepository.update(req.params.id, data);
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deleted = await SeoRepository.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'SEO configuration not found' });
            }
            res.status(200).json({ success: true, message: 'SEO configuration deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SeoController();
