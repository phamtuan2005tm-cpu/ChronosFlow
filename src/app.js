const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const session = require('express-session'); 
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
    secret: 'chronosflow_secret_key_tuan_pham', // Chuỗi ký mã hóa cookie bảo mật
    resave: false,                               // Không lưu lại session nếu không có biến đổi
    saveUninitialized: false,                    // Không tạo hộc tủ trống nếu chưa đăng nhập
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 // Chìa khóa cookie sống trong vòng 1 ngày (tính bằng mili-giây)
    }
}));

app.use('/', authRoutes); 
app.use('/api/tasks', taskRoutes);
require('dotenv').config();




app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes); 
app.use('/api/tasks', taskRoutes);

app.listen(PORT, () => {
    console.log(`🚀 ChronosFlow Server chạy chuẩn MVC tại: http://localhost:${PORT}`);
});