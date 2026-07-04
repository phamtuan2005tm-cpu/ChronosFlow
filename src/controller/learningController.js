const db = require('../config/database');

// 🟢 1. Lấy toàn bộ lịch sử học tập (Đã khớp với bảng của Tuấn)
exports.getAllLogs = async (req, res) => {
    try {
        const sql = `
            SELECT id, subject_name as title, duration, document_url as doc_url,
            DATE_FORMAT(study_date, "%d/%m/%Y") as createdAt 
            FROM learning_logs 
            WHERE user_id = 1
            ORDER BY id DESC
        `;
        const [results] = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi lấy nhật ký học tập từ DB cũ:', err);
        res.status(500).json({ error: 'Database query error' });
    }
};

// 🔵 2. Lưu một buổi học mới (Chuyển đổi giây thô và lưu chuẩn đét vào bảng của Tuấn)
exports.createLog = async (req, res) => {
    try {
        const { title, durationSeconds, docUrl } = req.body; // Hứng số giây dạng số nguyên từ Front-end
        if (!title || !durationSeconds) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin tiêu đề hoặc thời gian!' });
        }

        // Lấy ngày hôm nay định dạng YYYY-MM-DD để lưu vào trường study_date
        const todayStr = new Date().toISOString().split('T')[0];

        const sql = `
            INSERT INTO learning_logs (user_id, subject_name, duration, study_date, document_url) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [1, title, durationSeconds, todayStr, docUrl || null];
        
        await db.query(sql, values);
        res.json({ success: true, message: 'Đã lưu nhật ký buổi học vào DB cũ thành công!' });
    } catch (err) {
        console.error('❌ Lỗi lưu nhật ký vào DB cũ:', err);
        res.status(500).json({ error: 'Database insert error' });
    }
};