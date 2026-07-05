const express = require('express');
const router = express.Router();
const financeController = require('../controller/financeController');

// 👥 API Quản lý thành viên (Tuấn kiểm tra kỹ 3 dòng này)
router.post('/member', financeController.addMember);       // Thêm bạn mới
router.get('/members', financeController.getAllMembers);    // Lấy danh sách bạn
router.delete('/member/:id', financeController.deleteMember); // Xóa bạn

// 🤝 API Nhật ký nợ nần
router.get('/member-debt/:id', financeController.getMemberDebtDetail);
router.post('/debt', financeController.logDebt);

// 📈 API Thu chi cá nhân
router.post('/transaction', financeController.saveTransaction);
router.get('/dashboard-stats', financeController.getFinanceStats);

// 🎯 Cổng API xử lý hạn mức chi tiêu tháng (Budget)
router.get('/budget', financeController.getMonthlyBudget);
router.post('/budget', financeController.updateMonthlyBudget);

// Cổng API xóa một giao dịch bất kỳ dựa vào ID
router.delete('/transaction/:id', financeController.deleteTransaction);

module.exports = router;