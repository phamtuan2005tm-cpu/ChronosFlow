const express = require('express');
const router = express.Router();
const learningController = require('../controller/learningController');

// Khai báo 2 cổng kết nối cốt lõi
router.get('/api/learning/logs', learningController.getAllLogs);
router.post('/api/learning/logs', learningController.createLog);

module.exports = router;