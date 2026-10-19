const express = require('express');
const router = express.Router();
const PackageController = require('../controllers/packageController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

router.route('/categories')
    .get(PackageController.getCategories);

router.route('/categories/rename')
    .put(verifyToken, checkPermission('update', 'Packages'), PackageController.renameCategory);

router.route('/')
    .get(PackageController.getAll)
    .post(verifyToken, checkPermission('create', 'Packages'), PackageController.create);

router.route('/:id')
    .get(PackageController.getById)
    .put(verifyToken, checkPermission('update', 'Packages'), PackageController.update)
    .delete(verifyToken, checkPermission('delete', 'Packages'), PackageController.delete);

module.exports = router;
