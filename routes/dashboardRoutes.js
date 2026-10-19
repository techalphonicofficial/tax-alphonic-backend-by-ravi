const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { verifyToken } = require('../middlewares/auth');

router.get('/stats', verifyToken, DashboardController.getDashboardStats);

module.exports = router;
