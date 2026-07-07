const cron = require('node-cron');
const db = require('../config/database');
const { transporter } = require('../config/emailConfig');

// 🛡️ BỘ NHỚ TẠM CHỐT CHẶN SPAM (Lưu các ID lịch trình đã gửi thư thành công trong phiên chạy)
const sentScheduleCache = new Set();

const checkAndSendScheduleReminders = async () => {
    try {
        console.log("⏳ [Cron Job]: Đang quét Database tìm lịch trình sắp diễn ra...");

        const query = `
            SELECT 
                s.id AS schedule_id,
                s.title,
                s.start_time,
                s.notes,
                u.id AS user_id,
                u.user_email
            FROM schedules s
            JOIN users u ON s.user_id = u.id
            WHERE u.is_notification_enabled = 1
              AND s.start_time >= CONVERT_TZ(NOW(), '+00:00', '+07:00') 
              AND s.start_time <= DATE_ADD(CONVERT_TZ(NOW(), '+00:00', '+07:00'), INTERVAL 15 MINUTE)
        `;

        const [upcomingSchedules] = await db.execute(query);

        if (upcomingSchedules.length === 0) {
            console.log("🟢 [Cron Job]: Không có lịch trình nào sắp diễn ra trong 15 phút tới.");
            return;
        }

        for (const schedule of upcomingSchedules) {
            // 🚨 CHỐT CHẶN SPAM: Nếu ID lịch trình này đã nằm trong mảng đã gửi -> Bỏ qua lập tức
            if (sentScheduleCache.has(schedule.schedule_id)) {
                continue;
            }

            const formattedTime = new Date(schedule.start_time).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const mailOptions = {
                from: `"ChronosFlow Trợ Lý" <${process.env.EMAIL_USER}>`,
                to: schedule.user_email,
                subject: `⏰ [Nhắc Nhở] Lịch trình sắp diễn ra: ${schedule.title}`,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                        <div style="text-align: center; border-bottom: 2px dashed #334155; padding-bottom: 20px; margin-bottom: 25px;">
                            <span style="font-size: 40px;">⏰</span>
                            <h1 style="margin: 10px 0 0 0; color: #e11d48; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Nhắc Nhở Lịch Trình</h1>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6;">Chào bạn, lịch trình sau sắp diễn ra:</p>
                        <div style="background-color: #1e293b; border-left: 4px solid #e11d48; border-radius: 8px; padding: 20px; margin: 25px 0;">
                            <h3 style="margin: 0 0 8px 0;">📌 ${schedule.title}</h3>
                            <p style="margin: 0 0 6px 0;">🕒 Thời gian: <strong style="color: #f43f5e;">${formattedTime}</strong></p>
                            <p style="margin: 0;">📝 Ghi chú: ${schedule.notes || 'Không có ghi chú'}</p>
                        </div>
                    </div>
                `
            };

            // Bắn email đi
            await transporter.sendMail(mailOptions);
            console.log(`🟢 [Email Sent]: Đã gửi nhắc nhở lịch "${schedule.title}" đến <${schedule.user_email}>`);

            // 🛡️ ĐÓNG DẤU CHỦ QUYỀN: Nhét ID vào bộ nhớ tạm để phút sau không quét trúng nữa
            sentScheduleCache.add(schedule.schedule_id);
        }

    } catch (error) {
        console.error("🚨 [Cron Job Error]: Gặp lỗi trong quá trình quét lịch trình:", error);
    }
};

const initNotificationJobs = () => {
    cron.schedule('* * * * *', () => {
        checkAndSendScheduleReminders();
    });
    console.log("🟢 [Cron System]: Hệ thống quét lịch ngầm đã được kích hoạt thành công!");
};

module.exports = {
    initNotificationJobs
};