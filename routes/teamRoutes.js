const express = require('express');
const router = express.Router();
const TeamMemberController = require('../controllers/TeamMemberController');
const upload = require('../middlewares/upload');
const { requirePermission, publicRead } = require('../middlewares/auth');

// Admin sidebar module, or the specific one: either permission is enough.
const MODULE = ['CMS', 'TeamMembers'];

// The website lists team members without a login: only published ones (publicRead). Everything else needs a login.
router.get('/', publicRead(MODULE, 'published'), TeamMemberController.getAll);
router.get('/:id', ...requirePermission('read', MODULE), TeamMemberController.getById);
router.post('/', ...requirePermission('create', MODULE), upload.single('image'), TeamMemberController.create);
router.put('/:id', ...requirePermission('update', MODULE), upload.single('image'), TeamMemberController.update);
router.delete('/:id', ...requirePermission('delete', MODULE), TeamMemberController.delete);

module.exports = router;
