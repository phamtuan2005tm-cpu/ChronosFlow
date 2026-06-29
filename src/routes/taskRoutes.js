const express = require('express');
const router = express.Router();

const taskController = require('../controller/taskController');

router.get('/', taskController.getAllTask);
router.post('/', taskController.createNewTask);
// Tuyến đường xử lý cập nhật trạng thái Task ngầm dựa theo ID
router.put('/:id', taskController.updateTaskStatus);
// Tuyến đường xử lý xóa sổ Task dựa theo ID truyền vào URL
router.delete('/:id', taskController.deleteTask);
module.exports = router;