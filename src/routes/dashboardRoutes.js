const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');

// Đấu nối cổng xử lý thống kê trung tâm
router.get('/dashboard-stats', dashboardController.getDashboardStats);

module.exports = router;