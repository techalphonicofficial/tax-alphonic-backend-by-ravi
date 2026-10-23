const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const roleRoutes = require('./roleRoutes');
const permissionRoutes = require('./permissionRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const profileRoutes = require('./profileRoutes');
const pageRoutes = require('./pageRoutes');
const serviceCategoryRoutes = require('./serviceCategoryRoutes');
const serviceRoutes = require('./serviceRoutes');
const portfolioCategoryRoutes = require('./portfolioCategory.routes');
const portfolioItemRoutes = require('./portfolioItem.routes');
const bannerRoutes = require('./bannerRoutes');
const faqRoutes = require('./faqRoutes');
const teamMemberRoutes = require('./teamRoutes');
const testimonialRoutes = require('./testimonialRoutes');
const settingRoutes = require('./settingRoutes');
const aboutPageRoutes = require('./aboutPageRoutes');
const seoRoutes = require('./seoRoutes');
const mediaRoutes = require('./mediaRoutes');

// Blog Module Routes
const blogCategoryRoutes = require('./blogcategoriesRoutes');
const blogRoutes = require('./blogRoutes');
const blogtagsRoutes = require('./blogtagsRoutes');
const blogauthorsRoutes = require('./blogauthorsRoutes');
const blogCommentsRoutes = require('./blogCommentsRoutes');
const branchRoutes = require('./branchRoutes');
const partnerRoutes = require('./partnerRoutes');
const countryRoutes = require('./countryRoutes');
const pageCategoryRoutes = require('./pageCategoryRoutes');
const menuRoutes = require('./menuRoutes');
const packageRoutes = require('./packageRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/profile', profileRoutes);
router.use('/pages', pageRoutes);
// Landing pages on subdomains (<slug>.taxalphonic.com)
router.use('/landing-pages', require('./landingPageRoutes'));
router.use('/service-categories', serviceCategoryRoutes);
router.use('/services', serviceRoutes);
router.use('/portfolio-categories', portfolioCategoryRoutes);
router.use('/portfolio-items', portfolioItemRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/team', teamMemberRoutes);
router.use('/faqs', faqRoutes);
router.use('/banners', bannerRoutes);
router.use('/media', mediaRoutes);
router.use('/seo', seoRoutes);
router.use('/trash', require('./trashRoutes'));
// Public, for the website's /sitemap.xml
router.get('/sitemap', require('../controllers/SitemapController').getEntries);
router.use('/settings', settingRoutes);
router.use('/about-page', aboutPageRoutes);
router.use('/blogs', blogRoutes);
router.use('/blog-categories', blogCategoryRoutes);
router.use('/blog-tags', blogtagsRoutes);
router.use('/blog-authors', blogauthorsRoutes);
router.use('/blog-comments', blogCommentsRoutes);
router.use('/branches', branchRoutes);
router.use('/partners', partnerRoutes);
router.use('/countries', countryRoutes);
router.use('/page-categories', pageCategoryRoutes);
router.use('/menus', menuRoutes);
router.use('/packages', packageRoutes);
router.use('/dashboard', require('./dashboardRoutes'));
// PSEO Module Routes
router.use('/states', require('./stateRoutes'));
router.use('/locations', require('./locationRoutes'));
router.use('/industries', require('./industryRoutes'));
router.use('/technologies', require('./technologyRoutes'));
router.use('/problems', require('./problemRoutes'));
router.use('/seo-pages', require('./seopageRoutes'));

// Inquiries / Lead Management Routes
router.use('/inquiries', require('./inquiryRoutes'));

// Form Builder Routes
router.use('/forms', require('./formRoutes'));

// System Logs (general/error log files)
router.use('/system-logs', require('./systemLogRoutes'));

module.exports = router;

