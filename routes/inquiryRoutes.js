const express = require('express');
const router = express.Router();
const InquiryController = require('../controllers/InquiryController');
const { verifyToken } = require('../middlewares/auth');

// Public inquiry submission endpoint
router.post('/', InquiryController.create);

// Protected CRM management endpoints
router.get('/', verifyToken, InquiryController.getAll);
router.get('/stats', verifyToken, InquiryController.getStats);
router.get('/:id', verifyToken, InquiryController.getById);
router.put('/:id', verifyToken, InquiryController.update);
router.delete('/:id', verifyToken, InquiryController.delete);

module.exports = router;
