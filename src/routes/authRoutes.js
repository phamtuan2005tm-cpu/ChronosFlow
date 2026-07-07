const express = require('express');
const router = express.Router();
const authController = require('../controller/authController'); // Thống nhất dùng cục này

router.get('/login', authController.getLoginPage);
router.get('/register', authController.getRegisterPage);
router.get('/homePage', authController.getHomePage);

router.post('/register', authController.handleRegister);
router.post('/login', authController.handleLogin);

router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.handleForgotPassword);

module.exports = router;