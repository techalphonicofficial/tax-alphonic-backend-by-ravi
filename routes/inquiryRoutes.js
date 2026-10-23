const express = require('express');
const router = express.Router();
const InquiryController = require('../controllers/InquiryController');
const { verifyToken, checkPermission } = require('../middlewares/auth');

// Admin sidebar module (CRM), or the specific one: either permission is enough.
const MODULE = ['CRM', 'Inquiries'];

// Public inquiry submission endpoint
router.post('/', InquiryController.create);

// Protected CRM management endpoints
router.get('/', verifyToken, checkPermission('read', MODULE), InquiryController.getAll);
router.get('/stats', verifyToken, checkPermission('read', MODULE), InquiryController.getStats);
router.get('/:id', verifyToken, checkPermission('read', MODULE), InquiryController.getById);
router.put('/:id', verifyToken, checkPermission('update', MODULE), InquiryController.update);
router.delete('/:id', verifyToken, checkPermission('delete', MODULE), InquiryController.delete);

module.exports = router;
