// 1. KÍCH NỔ BIẾN MÔI TRƯỜNG TRÊN CÙNG
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 2. IMPORT CÁC TUYẾN ĐƯỜNG ROUTE (Giữ nguyên - Đã chuẩn theo ảnh)
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const learningRoutes = require('./routes/learningRoutes'); 

// 3. CẤU HÌNH VIEW ENGINE (💡 ĐÃ SỬA: Bỏ chữ 'src/' vì app.js đã ở trong src)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

// 4. CẤU HÌNH MIDDLEWARE & THƯ MỤC TĨNH (💡 ĐÃ SỬA: Thêm '../' để nhảy ra ngoài tìm thư mục public)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); 

// 5. CẤU HÌNH HỘC TỦ SESSION BẢO MẬT
app.use(session({
    secret: 'chronosflow_secret_key_tuan_pham', 
    resave: false,                                 
    saveUninitialized: false,                    
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// 6. ĐẤU NỐI ĐỒNG BỘ CÁC CỔNG ROUTE
app.use('/', authRoutes); 
app.use('/api/tasks', taskRoutes);
app.use(scheduleRoutes); 
app.use('/', learningRoutes); // Thông cổng API Learning Hub

// 7. KÍCH HOẠT SERVER
app.listen(PORT, () => {
    console.log(`🚀 ChronosFlow Server chạy chuẩn MVC tại: http://localhost:${PORT}`);
});