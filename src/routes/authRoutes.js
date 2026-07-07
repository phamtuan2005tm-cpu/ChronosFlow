const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 🟢 Tuyến đường dành cho Đăng Nhập
router.get('/login', (req, res) => {
    res.render('loginPage.ejs'); // Gọi đúng file loginPage.ejs chứa form đăng nhập
});
router.post('/login', authController.handleLogin);

// 🟢 Tuyến đường dành cho Đăng Ký
router.get('/register', authController.getRegisterPage); // Gọi hàm render('registerPage.ejs')
router.post('/register', authController.handleRegister);

// Các tuyến đường Quên mật khẩu
router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.handleForgotPassword);
router.get('/reset-password', authController.renderResetPassword);
router.post('/reset-password', authController.handleResetPassword);

module.exports = router;

