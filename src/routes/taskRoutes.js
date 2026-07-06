const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');

// Projects Routing
router.post('/project', taskController.createProject);
router.get('/projects', taskController.getActiveProjects);
router.delete('/project/:id', taskController.deleteProject);
router.put('/project/:id/complete', taskController.completeProject);

// Kanban Tasks Routing
router.get('/tasks', taskController.getAllTask);
router.post('/task', taskController.createNewTask);
router.delete('/task/:id', taskController.deleteTask);
router.put('/task/:id/status', taskController.updateTaskStatus);

// Timeline Logs Routing
router.post('/task/log', taskController.createTaskLog);
router.get('/task/:taskId/logs', taskController.getTaskLogs);


module.exports = router;