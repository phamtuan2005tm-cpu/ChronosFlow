const db = require('../config/database'); // Giữ nguyên kết nối MySQL Pool của Tuấn

// Bộ xử lý quy đổi chuỗi chữ 'k' trực tiếp trong Controller cho an toàn
const InlineFinanceUtil = {
    parseInput: (input) => {
        if (!input) return 0;
        let clean = input.toString().toLowerCase().trim();
        let multiplier = 1;
        if (clean.endsWith('k')) {
            multiplier = 1000;
            clean = clean.slice(0, -1).trim();
        }
        const value = parseFloat(clean);
        return isNaN(value) ? 0 : Math.round(value * multiplier);
    },
    formatDisplay: (amount) => {
        const num = parseFloat(amount);
        if (isNaN(num) || num === 0) return "0k";
        return (num / 1000) + "k";
    }
};

const financeController = {
    // =========================================================================
    // 👥 PHÂN HỆ 1: QUẢN LÝ THÀNH VIÊN (KẾT HỢP TÍNH TOÁN CÔNG NỢ ĐẠI SỐ)
    // =========================================================================

    // ➕ 1.1. API THÊM THÀNH VIÊN MỚI
    addMember: async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Tên bạn bè không được để trống Tuấn ơi!' });
            }
            const [result] = await db.query("INSERT INTO finance_members (name) VALUES (?)", [name.trim()]);
            res.json({ success: true, memberId: result.insertId, message: 'Đã thêm bạn vào danh sách!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi thêm thành viên: ' + error.message });
        }
    },

    // 📋 1.2. API LẤY TẤT CẢ THÀNH VIÊN
    getAllMembers: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT m.id, m.name, COALESCE(SUM(t.amount), 0) as totalDebt
                FROM finance_members m
                LEFT JOIN finance_transactions t ON m.id = t.member_id AND t.type = 'debt'
                GROUP BY m.id, m.name ORDER BY m.id DESC
            `);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi lấy danh sách: ' + error.message });
        }
    },

    // ❌ 1.3. API XÓA THÀNH VIÊN
    deleteMember: async (req, res) => {
        try {
            const { id } = req.params;
            await db.query("DELETE FROM finance_members WHERE id = ?", [id]);
            res.json({ success: true, message: 'Đã xóa bạn và dọn lịch sử!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi xóa: ' + error.message });
        }
    },

    // =========================================================================
    // 🤝 PHÂN HỆ 2: DEBT TRACKER NÂNG CAO (XỬ LÝ MODAL POP-UP CHI TIẾT)
    // =========================================================================

    getMemberDebtDetail: async (req, res) => {
        try {
            const memberId = req.params.id;
            const [history] = await db.query(
                "SELECT amount, note, created_at FROM finance_transactions WHERE member_id = ? AND type = 'debt' ORDER BY created_at DESC",
                [memberId]
            );
            res.json(history);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lấy lịch sử nợ: ' + error.message });
        }
    },

    logDebt: async (req, res) => {
        try {
            const { memberId, amountInput, note, mode } = req.body;
            const rawAmount = InlineFinanceUtil.parseInput(amountInput);
            if (rawAmount <= 0) return res.status(400).json({ message: 'Số tiền nhập không hợp lệ!' });

            const finalAmount = (mode === 'they_owe') ? Math.abs(rawAmount) : -Math.abs(rawAmount);
            await db.query(
                "INSERT INTO finance_transactions (amount, type, member_id, note) VALUES (?, 'debt', ?, ?)",
                [finalAmount, memberId, note || (mode === 'they_owe' ? 'Họ nợ Tuấn' : 'Tuấn nợ họ')]
            );
            res.json({ success: true, message: 'Đã ghi sổ giao dịch nợ!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lưu nợ: ' + error.message });
        }
    },

    // =========================================================================
    // 📈 PHÂN HỆ 3: QUẢN LÝ THU CHI CÁ NHÂN & THEO DÕI SỐ DƯ
    // =========================================================================

    saveTransaction: async (req, res) => {
        try {
            const { amount, type, note } = req.body;
            const rawAmount = InlineFinanceUtil.parseInput(amount);
            if (rawAmount <= 0) return res.status(400).json({ message: 'Số tiền không hợp lệ!' });

            await db.query(
                "INSERT INTO finance_transactions (amount, type, note) VALUES (?, ?, ?)",
                [rawAmount, type, note || (type === 'income' ? 'Thu nhập cá nhân' : 'Chi tiêu cá nhân')]
            );
            res.json({ success: true, message: 'Ghi sổ thành công!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi ghi thu chi: ' + error.message });
        }
    },

    getFinanceStats: async (req, res) => {
        try {
            const [incomeRes] = await db.query("SELECT SUM(amount) as total FROM finance_transactions WHERE type = 'income' AND member_id IS NULL");
            const [expenseRes] = await db.query("SELECT SUM(amount) as total FROM finance_transactions WHERE type = 'expense' AND member_id IS NULL");

            const totalIncome = incomeRes[0].total || 0;
            const totalExpense = expenseRes[0].total || 0;
            const currentBalance = totalIncome - totalExpense;

            const [timelineRows] = await db.query(`
                SELECT t.id, t.amount, t.type, t.note, t.created_at, m.name as member_name
                FROM finance_transactions t LEFT JOIN finance_members m ON t.member_id = m.id
                ORDER BY t.created_at DESC LIMIT 50
            `);

            res.json({
                totalBalanceK: InlineFinanceUtil.formatDisplay(currentBalance),
                timeline: timelineRows
            });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi cập nhật Dashboard: ' + error.message });
        }
    },

    // =========================================================================
    // 🎯 PHÂN HỆ 4: QUẢN LÝ HẠN MỨC CHI TIÊU THÁNG (BUDGET STRESS)
    // =========================================================================

    getMonthlyBudget: async (req, res) => {
        try {
            const currentMonthYear = new Date().toISOString().slice(0, 7); // Định dạng "YYYY-MM"

            // 1. Lấy số tiền hạn mức tối đa cài đặt trong DB (Mặc định cho 1000k nếu chưa cài)
            const [budgetRows] = await db.query(
                "SELECT amount_limit FROM finance_budgets WHERE month_year = ? LIMIT 1",
                [currentMonthYear]
            );
            const limitAmount = budgetRows.length > 0 ? budgetRows[0].amount_limit : 1000000; 

            // 2. Tính tổng các khoản thực CHI (expense) cá nhân của Tuấn trong tháng này
            const [expenseRows] = await db.query(`
                SELECT COALESCE(SUM(amount), 0) as totalSpent 
                FROM finance_transactions 
                WHERE type = 'expense' 
                  AND member_id IS NULL 
                  AND DATE_FORMAT(created_at, '%Y-%m') = ?
            `, [currentMonthYear]);
            
            const totalSpent = expenseRows[0].totalSpent || 0;

            res.json({
                limitK: limitAmount / 1000,
                spentK: totalSpent / 1000,
                monthYear: currentMonthYear
            });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi Backend lấy hạn mức: ' + error.message });
        }
    },

   updateMonthlyBudget: async (req, res) => {
        try {
            const { limitInput } = req.body;
            const rawLimit = InlineFinanceUtil.parseInput(limitInput);

            if (rawLimit <= 0) return res.status(400).json({ message: 'Số tiền hạn mức không hợp lệ!' });

            const currentMonthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"

            // 1. Kiểm tra sự tồn tại để quyết định INSERT hay UPDATE
            const [exist] = await db.query("SELECT id FROM finance_budgets WHERE month_year = ?", [currentMonthYear]);

            if (exist.length > 0) {
                await db.query("UPDATE finance_budgets SET amount_limit = ? WHERE month_year = ?", [rawLimit, currentMonthYear]);
            } else {
                // 2. Lấy thử 1 danh mục có sẵn
                let [categories] = await db.query("SELECT id FROM finance_categories LIMIT 1");
                let safeCategoryId;

                if (categories.length > 0) {
                    safeCategoryId = categories[0].id;
                } else {
                    // 🎯 BẢO VỆ TỐI CAO: Nếu bảng categories trống hoàn toàn, tự động tạo nhanh 1 danh mục mẫu để lấy ID gánh tạ
                    const [newCat] = await db.query(
                        "INSERT INTO finance_categories (name, type) VALUES (?, 'expense')",
                        ['💰 Chi tiêu tổng hợp']
                    );
                    safeCategoryId = newCat.insertId;
                }

                // 3. Thực hiện INSERT hạn mức với ID danh mục chắc chắn hợp lệ, không lo bị NULL hay dính khóa ngoại
                await db.query(
                    "INSERT INTO finance_budgets (category_id, amount_limit, month_year) VALUES (?, ?, ?)", 
                    [safeCategoryId, rawLimit, currentMonthYear]
                );
            }

            res.json({ success: true, message: 'Đã cập nhật cấu hình hạn mức tháng này!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi Backend cập nhật hạn mức: ' + error.message });
        }
    },

    // ❌ 4.3. API XÓA GIAO DỊCH (HỖ TRỢ CẢ THU CHI CÁ NHÂN LẪN NỢ TRONG MODAL)
    // Đã được kéo vào đúng vị trí hợp pháp bên trong object financeController!
    deleteTransaction: async (req, res) => {
        try {
            const { id } = req.params;

            // Thực hiện xóa thẳng dòng giao dịch đó trong Database
            const [result] = await db.query("DELETE FROM finance_transactions WHERE id = ?", [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Không tìm thấy giao dịch này Tuấn ơi!' });
            }

            res.json({ success: true, message: 'Đã xóa giao dịch và cập nhật lại dòng tiền!' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi Backend khi xóa giao dịch: ' + error.message });
        }
    }
};

module.exports = financeController;