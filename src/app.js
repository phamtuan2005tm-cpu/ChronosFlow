const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes); 

app.listen(PORT, () => {
    console.log(`🚀 ChronosFlow Server chạy chuẩn MVC tại: http://localhost:${PORT}`);
});