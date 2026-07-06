const express = require('express');
const router = express.Router();
const settingsController = require('../controller/settingController');

// Đấu nối cổng API Settings
router.get('/user-settings', settingsController.getUserSettings);
router.post('/user-settings', settingsController.saveUserSettings);

module.exports = router;