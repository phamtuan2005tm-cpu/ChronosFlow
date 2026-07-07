const nodemailer = require('nodemailer');
require('dotenv').config();

// Khởi tạo bộ truyền tải SMTP kết nối đến Gmail
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // Sử dụng cổng bảo mật 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    pool: true, // Giữ kết nối luôn mở để tối ưu tốc độ
});

module.exports = {
    transporter
};