// 1. KÍCH NỔ BIẾN MÔI TRƯỜNG TRÊN CÙNG
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 2. IMPORT CÁC TUYẾN ĐƯỜNG ROUTE (Số ít đồng bộ 100%)
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const learningRoutes = require('./routes/learningRoutes'); 
const financeRoutes = require('./routes/financeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const settingRoutes = require('./routes/settingRoute'); 

const { initNotificationJobs } = require('./jobs/notificationJob');

// 3. CẤU HÌNH VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

// 4. CẤU HÌNH MIDDLEWARE & THƯ MỤC TĨNH
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); 

// 5. CẤU HÌNH HỘC TỦ SESSION BẢO MẬT (Đã nới lỏng proxy tối ưu cho Render Free)
app.use(session({
    secret: 'chronosflow_secret_key_tuan_pham', 
    resave: true,                  // 🟢 Chuyển sang true để duy trì trạng thái phiên liên tục trên Cloud
    saveUninitialized: true,       // 🟢 Chuyển sang true để ép khởi tạo session ngay khi client truy cập
    cookie: { 
        secure: false,             // 🟢 Bắt buộc false vì Render gói Free chạy qua HTTP Proxy ẩn danh
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// 6. ĐẤU NỐI ĐỒNG BỘ CÁC CỔNG ROUTE
app.use('/', authRoutes); 
app.use('/api', taskRoutes);
app.use(scheduleRoutes); 
app.use('/api/learning', learningRoutes); 
app.use('/api/finance', financeRoutes);
app.use('/api', dashboardRoutes); 

// 🟢 ĐÃ SỬA: Đổi tiền tố từ '/api/settingRoutes' thành '/api' để khớp chuẩn đét với Front-end /api/user-settings
app.use('/api', settingRoutes); 

// 🟢 ĐIỀU HƯỚNG GỐC CHUẨN (Trả lại dòng code này của Tuấn để bẻ khóa lỗi Cannot GET)
app.get('/', (req, res) => {
    res.redirect('/login');
});

// 7. KÍCH HOẠT SERVER HOÀN CHỈNH
app.listen(PORT, () => {
    console.log(`🚀 ChronosFlow Server chạy chuẩn MVC tại cổng: ${PORT}`);
    console.log(`📡 DATABASE HOST HIỆN TẠI ĐANG CHẠY: [${process.env.DB_HOST}]`);
    
    try {
        initNotificationJobs();
        console.log(`⏰ [Cron Job] Hệ thống quét thông báo lịch trình hoạt động ổn định!`);
    } catch (err) {
        console.log(`⚠️ Lỗi khởi động Cron Job nhưng Server vẫn chạy:`, err.message);
    }
});