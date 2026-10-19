const express = require('express');
const router = express.Router();
const BannerController = require('../controllers/BannerController');
const upload = require('../middlewares/upload');

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), BannerController.create);
router.get('/', BannerController.getAll);
router.get('/:id', BannerController.getById);
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), BannerController.update);
router.delete('/:id', BannerController.delete);

module.exports = router;
