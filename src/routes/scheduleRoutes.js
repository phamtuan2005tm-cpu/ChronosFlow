const express = require('express');
const router = express.Router();
const scheduleController = require('../controller/scheduleController');

// Khai báo các cổng API map thẳng vào các hàm logic trong Controller
router.get('/api/schedules', scheduleController.getAllSchedules);
router.post('/api/schedules', express.json(), scheduleController.createScheduleSlot);
router.delete('/api/schedules/:id', scheduleController.deleteScheduleSlot);
router.put('/api/schedules/:id', scheduleController.updateScheduleSlot);

module.exports = router;