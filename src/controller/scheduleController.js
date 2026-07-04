const db = require('../config/database');

// 🟢 1. Logic lấy toàn bộ lịch trình từ MySQL (Dùng Async/Await)
// 🟢 1. Logic lấy toàn bộ lịch trình từ MySQL (BẮT BUỘC PHẢI THÊM end_time VÀ series_id)
exports.getAllSchedules = async (req, res) => {
    try {
        const sql = `
            SELECT id, title, 
            DATE_FORMAT(start_time, "%Y-%m-%d") as date, 
            TIME_FORMAT(start_time, "%H:%i") as startTime, 
            TIME_FORMAT(end_time, "%H:%i") as endTime, 
            color, type, series_id
            FROM schedules
        `;
        
        // Chờ MySQL trả kết quả về dạng mảng đầy đủ linh kiện
        const [results] = await db.query(sql); 
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi Controller khi lấy Schedules:', err);
        res.status(500).json({ error: 'Database query error' });
    }
};

exports.createScheduleSlot = async (req, res) => {
    try {
        const { title, date, startTime, endTime, category, type, repeatUntil, repeatDays } = req.body;
        
        let color = '#2563eb'; // learning
        if (category === 'work') color = '#ef4444';
        if (category === 'personal') color = '#10b981';

        // Tạo một mã nhóm độc nhất nếu là lịch lặp, lịch đơn thì để null
        const seriesId = (type === 'weekly' || type === 'monthly') ? `series_${Date.now()}` : null;

        const sql = 'INSERT INTO schedules (user_id, title, start_time, end_time, color, type, series_id) VALUES (?, ?, ?, ?, ?, ?, ?)';

        // 🟢 TRƯỜNG HỢP 1: SỰ KIỆN MỘT LẦN (SINGLE EVENT)
        if (type === 'single' || !repeatUntil) {
            const fullStartDateTime = `${date} ${startTime}:00`;
            const fullEndDateTime = `${date} ${endTime}:00`;
            const values = [1, title, fullStartDateTime, fullEndDateTime, color, 'single', seriesId];
            const [result] = await db.query(sql, values);
            return res.json({ success: true, insertedId: result.insertId });
        }

        let startDateCursor = new Date(date);
        const endDateLimit = new Date(repeatUntil);
        let insertedCount = 0;

        // 🔵 TRƯỜNG HỢP 2: LẶP LẠI HÀNG TUẦN THEO THỨ (WEEKLY)
        if (type === 'weekly') {
            while (startDateCursor <= endDateLimit) {
                const currentDayOfWeek = startDateCursor.getDay(); 
                if (repeatDays.includes(currentDayOfWeek)) {
                    const formattedDate = startDateCursor.toISOString().split('T')[0];
                    const values = [1, title, `${formattedDate} ${startTime}:00`, `${formattedDate} ${endTime}:00`, color, 'recurring', seriesId];
                    await db.query(sql, values);
                    insertedCount++;
                }
                startDateCursor.setDate(startDateCursor.getDate() + 1);
            }
        }

        // 🟡 TRƯỜNG HỢP 3: LẶP LẠI HÀNG THÁNG CỐ ĐỊNH THEO NGÀY SỐ (MONTHLY)
        if (type === 'monthly') {
            const targetDayNumber = new Date(date).getDate(); 
            while (startDateCursor <= endDateLimit) {
                if (startDateCursor.getDate() === targetDayNumber) {
                    const formattedDate = startDateCursor.toISOString().split('T')[0];
                    const values = [1, title, `${formattedDate} ${startTime}:00`, `${formattedDate} ${endTime}:00`, color, 'recurring', seriesId];
                    await db.query(sql, values);
                    insertedCount++;
                }
                startDateCursor.setDate(startDateCursor.getDate() + 1);
            }
        }

        res.json({ success: true, message: `Đã tự động rải ${insertedCount} ô lịch lặp thành công!` });

    } catch (err) {
        console.error('❌ Lỗi xử lý tạo lịch lặp:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// 🔴 3. Logic xóa một ô lịch trình khỏi MySQL dựa vào ID
exports.deleteScheduleSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { mode } = req.query; // Nhận 'all' hoặc 'single' từ Frontend gửi lên

        // Bước 1: Tìm thông tin của slot này để lấy series_id trước khi xóa
        const [slots] = await db.query('SELECT series_id FROM schedules WHERE id = ?', [id]);
        if (slots.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình này!' });
        }
        
        const seriesId = slots[0].series_id;

        // Bước 2: Tiến hành xóa dựa theo chế độ người dùng chọn
        if (mode === 'all' && seriesId) {
            // Xóa toàn bộ chuỗi lịch lặp có cùng series_id
            const sql = 'DELETE FROM schedules WHERE series_id = ?';
            await db.query(sql, [seriesId]);
            return res.json({ success: true, message: 'Xóa toàn bộ chuỗi lịch thành công!' });
        } else {
            // Chế độ mặc định hoặc lịch đơn lẻ: Chỉ xóa đúng 1 ô
            const sql = 'DELETE FROM schedules WHERE id = ?';
            await db.query(sql, [id]);
            return res.json({ success: true, message: 'Xóa một ô lịch trình thành công!' });
        }
    } catch (err) {
        console.error('❌ Lỗi Controller khi xóa Schedules:', err);
        res.status(500).json({ error: 'Database delete error' });
    }
};
exports.updateScheduleSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const sql = 'UPDATE schedules SET title = ? WHERE id = ?';
        await db.query(sql, [title, id]);

        res.json({ success: true, message: 'Cập nhật lịch trình thành công!' });
    } catch (err) {
        console.error('❌ Lỗi Controller khi cập nhật Schedules:', err);
        res.status(500).json({ error: 'Database update error' });
    }
};