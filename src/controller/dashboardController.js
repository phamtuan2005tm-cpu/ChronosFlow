const db = require('../config/database');

// 📊 CENTRAL CONTROLLER: FETCH AGGREGATED METRICS FOR DASHBOARD
exports.getDashboardStats = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ totalProjects: 0, activeTasks: 0, financeBalance: 0, learningCoursesCount: 0, taskPriorityDataset: [0, 0, 0], latestProjectId: null, learningHoursDataset: [0,0,0,0,0,0,0], todaySchedules: [] });
    }

    const userId = req.session.user.id;

    try {
        // 1. 📁 [Projects] Đếm tổng số dự án Active
        const sqlProjects = "SELECT COUNT(*) AS count FROM projects WHERE user_id = ? AND status = 'Active'";
        const [projectRows] = await db.execute(sqlProjects, [userId]);
        const totalProjects = projectRows[0].count || 0;

        // 2. 🚨 [Tasks] Đếm tổng số task chưa xong VÀ tìm ID dự án chứa task khẩn cấp mới nhất
        const sqlTasks = "SELECT COUNT(*) AS count, MAX(project_id) AS latestProjectId FROM tasks WHERE user_id = ? AND status != 'Done'";
        const [taskRows] = await db.execute(sqlTasks, [userId]);
        const activeTasks = taskRows[0].count || 0;
        const latestProjectId = taskRows[0].latestProjectId || null;

        // 3. 🍩 [Analytics Tasks] Gom nhóm theo mức độ Priority để nạp cho biểu đồ tròn
        const sqlPriority = `
            SELECT priority, COUNT(*) AS count 
            FROM tasks 
            WHERE user_id = ? AND status != 'Done'
            GROUP BY priority
        `;
        const [priorityRows] = await db.execute(sqlPriority, [userId]);

        let highCount = 0; let mediumCount = 0; let lowCount = 0;
        priorityRows.forEach(row => {
            if (row.priority === 'High') highCount = row.count;
            if (row.priority === 'Medium') mediumCount = row.count;
            if (row.priority === 'Low') lowCount = row.count;
        });
        const taskPriorityDataset = [highCount, mediumCount, lowCount];

        // 4. 💰 [Finance] Tính số dư ví tiền thực tế (Income - Expense) từ bảng finance_transactions
        const sqlFinance = `
            SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0) AS balance 
            FROM finance_transactions
        `;
        const [financeRows] = await db.execute(sqlFinance);
        const financeBalance = financeRows[0].balance || 0;

        // 5. 📚 [Learning - Courses] Đếm tổng số lượng môn học đang có từ bảng subjects
        const sqlLearning = "SELECT COUNT(*) AS count FROM subjects";
        const [learningRows] = await db.execute(sqlLearning);
        const learningCoursesCount = learningRows[0].count || 0;

        // 6. 📈 [Learning - Study Analytics Chart] Lấy tổng số giờ học thực tế theo từng thứ trong tuần từ bảng learning_logs
        // Mẹo: WEEKDAY() trong MySQL trả về 0 = Thứ 2, 1 = Thứ 3, ..., 6 = Chủ Nhật
        const sqlHours = `
            SELECT WEEKDAY(study_date) AS day_index, SUM(duration) AS total_duration 
            FROM learning_logs 
            WHERE user_id = ? AND YEARWEEK(study_date, 1) = YEARWEEK(CURDATE(), 1)
            GROUP BY WEEKDAY(study_date)
        `;
        const [hoursRows] = await db.execute(sqlHours, [userId]);
        
        // Khởi tạo mảng 7 ngày trống tương ứng [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        let learningHoursDataset = [0, 0, 0, 0, 0, 0, 0];
        hoursRows.forEach(row => {
            if (row.day_index >= 0 && row.day_index <= 6) {
                // Đổi đơn vị từ Phút (trong bảng) sang Giờ để hiển thị đẹp trên Chart (Ví dụ: 120 phút = 2 giờ)
                learningHoursDataset[row.day_index] = parseFloat((row.total_duration / 60).toFixed(1));
            }
        });

        // 📅 7. [Schedules - Today's Agenda] Lấy danh sách lịch trình của ngày hôm nay
        // Giải pháp tối ưu: Lấy chuỗi ngày YYYY-MM-DD chuẩn theo giờ Việt Nam từ Node.js
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; // Độ lệch múi giờ tính bằng mili-giây
        const localISOTime = (new Date(Date.now() - tzOffset)).toISOString(); // Ép chuẩn giờ địa phương
        const todayStr = localISOTime.split('T')[0]; // Cắt lấy chuỗi '2026-07-05' chính xác

        const sqlSchedule = `
            SELECT title, DATE_FORMAT(start_time, '%H:%i') AS start_time 
            FROM schedules 
            WHERE user_id = ? AND DATE(start_time) = ?
            ORDER BY start_time ASC
        `;
        const [todaySchedules] = await db.execute(sqlSchedule, [userId, todayStr]);

        console.log(`📡 central Engine: Đồng bộ hoàn tất biểu đồ sóng và lịch trình ngày hôm nay.`);

        // 8. Trả toàn bộ dữ liệu thật về cho Frontend
        return res.status(200).json({
            financeBalance,
            learningCoursesCount,
            totalProjects,
            activeTasks,
            taskPriorityDataset,
            latestProjectId,
            learningHoursDataset, // 🚀 MẢNG SỐ GIỜ HỌC THẬT TỪ DATABASE
            todaySchedules        // 🚀 MẢNG LỊCH TRÌNH THẬT TRONG NGÀY CỦA TUẤN
        });

    } catch (error) {
        console.error("🚨 Lỗi tại central dashboardController engine:", error);
        return res.status(500).json({ totalProjects: 0, activeTasks: 0, financeBalance: 0, learningCoursesCount: 0, taskPriorityDataset: [0, 0, 0], learningHoursDataset: [0,0,0,0,0,0,0], todaySchedules: [] });
    }
};