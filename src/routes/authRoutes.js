const express = require('express');
const { getLoginPage, getRegisterPage } = require('../controller/authController');
const router = express.Router();
const authController = require('../controller/authController');

router.get('/login', getLoginPage);
router.get('/register', getRegisterPage);
router.get('/homePage', authController.getHomePage); 
router.post('/register', authController.handleRegister);
router.post('/login', authController.handleLogin);
module.exports = router;