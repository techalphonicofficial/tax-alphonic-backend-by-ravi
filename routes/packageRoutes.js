const express = require('express');
const router = express.Router();
const PackageController = require('../controllers/packageController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.route('/categories')
    .get(verifyToken, checkPermission('read', 'Packages'), PackageController.getCategories);

router.route('/categories/rename')
    .put(verifyToken, checkPermission('update', 'Packages'), PackageController.renameCategory);

router.route('/')
    .get(verifyToken, checkPermission('read', 'Packages'), PackageController.getAll)
    .post(verifyToken, checkPermission('create', 'Packages'), PackageController.create);

// GET one stays public: the live preview loads the packages a Packages block shows.
router.route('/:id')
    .get(PackageController.getById)
    .put(verifyToken, checkPermission('update', 'Packages'), PackageController.update)
    .delete(verifyToken, checkPermission('delete', 'Packages'), PackageController.delete);

module.exports = router;
