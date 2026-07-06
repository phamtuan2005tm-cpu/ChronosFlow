const db = require('../config/database');

// Bộ nhớ tạm thời (Mock Config) để đồng bộ trạng thái giao diện Front-end
let localUserConfig = {
    username: "tuấn",
    darkMode: false,
    allowEmail: false,
    emailFrequency: "medium"
};

// ⚙️ 1. GET CURRENT USER SETTINGS
exports.getUserSettings = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;

    try {
        // Lấy thông báo cấu hình email từ bảng users dựa vào ID người dùng đang đăng nhập
        const [userRows] = await db.execute("SELECT username, is_notification_enabled FROM users WHERE id = ?", [userId]);
        
        if (userRows.length > 0) {
            // Đồng bộ tên và trạng thái gửi mail từ DB vào bộ nhớ tạm
            if (userRows[0].username) localUserConfig.username = userRows[0].username;
            localUserConfig.allowEmail = userRows[0].is_notification_enabled === 1;
        }

        return res.status(200).json(localUserConfig);
    } catch (error) {
        console.error("🚨 lỗi nạp cấu hình tại settingController:", error);
        // Nếu lỗi, trả về cấu hình mặc định để Front-end không bị crash giao diện
        return res.status(500).json(localUserConfig);
    }
};

// ⚙️ 2. SAVE NEW USER SETTINGS
exports.saveUserSettings = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const { username, darkMode, allowEmail, emailFrequency } = req.body;

    try {
        // 🔄 CẬP NHẬT THẲNG XUỐNG DATABASE CỦA TUẤN
        // Đổi trạng thái true/false từ switch gạt sang dạng 1/0 của MySQL
        const emailToggleBit = allowEmail ? 1 : 0;
        
        // Cập nhật cả cột username và is_notification_enabled trong bảng users
        await db.execute(
            "UPDATE users SET username = ?, is_notification_enabled = ? WHERE id = ?", 
            [username, emailToggleBit, userId]
        );

        // Ghi đè dữ liệu mới vào cấu hình cục bộ để giữ trạng thái Dark Mode
        localUserConfig = { username, darkMode, allowEmail, emailFrequency };

        // Đồng bộ lại tên mới vào session để toàn bộ trang web nhận diện đúng tên Tuấn
        req.session.user.username = username;

        console.log(`📡 settingController Engine: Lưu thành công cấu hình cho User ID ${userId}`);
        return res.status(200).json({ success: true, message: "Settings saved successfully" });

    } catch (error) {
        console.error("🚨 Lỗi lưu cài đặt tại settingController:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};