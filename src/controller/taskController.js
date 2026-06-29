const db = require('../config/database');

exports.getAllTask = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [rows] = await db.execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC", [userId]);

        return res.status(200).json(rows);
    } catch (error) {
        console.error("Có lỗi ở phần hiển thị nhiệm vụ, cụ thể là:", error);
        return res.status(500).json({message : " Lỗi hệ thống backend khi hiện dữ liệu "})
    }
}
exports.createNewTask = async (req, res) => {
    try {
        // 1. Phải bốc dữ liệu từ trong cái hộp req.body ra TRƯỚC để JavaScript định nghĩa biến
        const { title, priority, dueDate } = req.body;
        const userId = req.session.user.id;
        // 2. Bẫy dữ liệu trống
        if (!title || !dueDate) {
            return res.status(400).json({ message: "Nhập đủ thông tin coi" });
        }

        // 3. Chuẩn bị câu lệnh SQL vật lý (5 cột tương ứng 5 dấu hỏi chấm)
        const sql = 'INSERT INTO tasks (title, priority, due_date, status, user_id) VALUES (?, ?, ?, ?, ?)';
        
        // 4. Kích nổ lệnh cắm vào MySQL (Đảm bảo bảng users của bạn đã có ít nhất một user có id = 1 nhé)
        const [result] = await db.execute(sql, [title, priority, dueDate, 'To-Do', userId]);

        // 5. Trả dữ liệu JSON sạch về cho Frontend vẽ giao diện
        return res.status(201).json({
            id: result.insertId,
            title: title,
            priority: priority,
            due_date: dueDate,
            status: 'To-Do'
        });

    } catch (error) {
        console.error("🚨 LỖI CHI TIẾT TỪ DATABASE:");
        console.error(error); 
        return res.status(500).json({ message: "Lỗi hệ thống backend khi tạo nhiệm vụ mới" });
    }
};

// 📡 API 3: CẬP NHẬT TRẠNG THÁI TASK (PUT /api/tasks/:id)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;   // Hốt cái ID của Task nằm trên thanh URL (VD: /api/tasks/5)
        const { status } = req.body; // Hốt cái trạng thái mới ('In Progress' hoặc 'Done') từ Body gửi lên

        // Chọc lệnh SQL UPDATE thô xuống MySQL vật lý
        const sql = 'UPDATE tasks SET status = ? WHERE id = ?';
        await db.execute(sql, [status, id]);

        // Trả về tín hiệu JSON báo thành công cho Front-end mừng
        return res.status(200).json({ message: 'Cập nhật trạng thái thành công nha!' });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái ở Backend:", error);
        return res.status(500).json({ message: 'Lỗi hệ thống không thể chuyển trạng thái task' });
    }
};
// 📡 API 4: XÓA TASK BIỆT LẬP (DELETE /api/tasks/:id)
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params; // Hốt cái ID của Task cần xóa trên thanh URL xuống

        // Chọc lệnh SQL DELETE thô xuống MySQL vật lý để xóa sổ vĩnh viễn dòng này
        const sql = 'DELETE FROM tasks WHERE id = ?';
        await db.execute(sql, [id]);

        // Trả tín hiệu JSON báo Front-end biết đường mà xóa thẻ trên màn hình
        return res.status(200).json({ message: 'Đã xóa task thành công khỏi vũ trụ!' });
    } catch (error) {
        console.error("Lỗi xóa task ở Backend:", error);
        return res.status(500).json({ message: 'Lỗi hệ thống không thể xóa task' });
    }
}; 