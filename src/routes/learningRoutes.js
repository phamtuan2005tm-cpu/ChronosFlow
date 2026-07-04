const express = require('express');
const router = express.Router();
const learningController = require('../controller/learningController');

// 🟢 1. Cổng cũ (Nhật ký bấm giờ học thực tế)
router.get('/logs', learningController.getAllLogs);
router.post('/logs', learningController.createLog);

// 🔵 2. Cổng mới quản lý Môn học (Subjects)
router.get('/subjects', learningController.getAllSubjects);
router.post('/subjects', learningController.createSubject);

// 🟡 3. Cổng mới quản lý Tài liệu (Documents)
router.get('/subjects/:subjectId/documents', learningController.getDocumentsBySubject);
router.post('/documents', learningController.createDocument);

// 🧠 4. Cổng kích nổ sinh đề thi trắc nghiệm bằng Gemini AI
router.post('/quiz/generate', learningController.generateQuizJson);

// update and delete
router.put('/subjects/:id', learningController.updateSubject);
router.delete('/subjects/:id', learningController.deleteSubject);

module.exports = router;