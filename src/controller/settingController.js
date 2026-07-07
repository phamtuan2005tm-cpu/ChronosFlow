const db = require('../config/database');

// Bộ nhớ tạm thời (Mock Config) để giữ trạng thái Dark Mode và Tần suất Email
let localUserConfig = {
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
        // 🚨 DATABASE CHỈ CÓ user_email và is_notification_enabled -> LẤY ĐÚNG 2 CỘT NÀY
        const [userRows] = await db.execute(
            "SELECT user_email, is_notification_enabled FROM users WHERE id = ?", 
            [userId]
        );
        
        if (userRows.length > 0) {
            // Đồng bộ trạng thái từ DB vào bộ nhớ tạm
            localUserConfig.allowEmail = userRows[0].is_notification_enabled === 1;
        }

        return res.status(200).json(localUserConfig);
    } catch (error) {
        console.error("🚨 Lỗi nạp cấu hình tại settingController:", error);
        return res.status(500).json(localUserConfig);
    }
};

// ⚙️ 2. SAVE NEW USER SETTINGS (BẢN VÁ LỖI CHỐT HẠ)
exports.saveUserSettings = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    // Front-end gửi lên: { username, darkMode, allowEmail, emailFrequency }
    const { username, darkMode, allowEmail, emailFrequency } = req.body;

    try {
        // 🔄 Đổi trạng thái true/false sang dạng 1/0 của MySQL TINYINT(1)
        const emailToggleBit = allowEmail ? 1 : 0;
        
        // 🛡️ CÂU LỆNH SQL VÁ LỖI: Chỉ UPDATE cột tồn tại thực tế (is_notification_enabled)
        await db.execute(
            "UPDATE users SET is_notification_enabled = ? WHERE id = ?", 
            [emailToggleBit, userId]
        );

        // Ghi đè dữ liệu mới vào bộ nhớ tạm để Front-end không bị mất trạng thái Dark Mode / Tần suất
        localUserConfig = { darkMode, allowEmail, emailFrequency };

        // Nếu Front-end có dùng session username, ta gán tạm bằng email hoặc giá trị gửi lên để tránh lỗi
        req.session.user.username = username || req.session.user.user_email;

        console.log(`🟢 Settings Engine: Lưu thành công cấu hình thông báo cho User ID ${userId} (Trạng thái: ${emailToggleBit})`);
        return res.status(200).json({ success: true, message: "Settings saved successfully" });

    } catch (error) {
        console.error("🚨 Lỗi lưu cài đặt tại settingController:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};