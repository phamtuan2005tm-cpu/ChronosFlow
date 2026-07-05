const db = require('../config/database');

// 1.1. Create new project workspace
exports.createProject = async (req, res) => {
    try {
        const { name, priority, startDate, dueDate } = req.body;
        const userId = req.session.user.id;
        if (!name || !dueDate || !startDate) {
            return res.status(400).json({ success: false, message: "Please provide all required fields!" });
        }
        const sql = 'INSERT INTO projects (user_id, name, priority, start_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?)';
        await db.execute(sql, [userId, name.trim(), priority || 'Medium', startDate, dueDate, 'Active']);
        return res.status(201).json({ success: true, message: "Project launched successfully!" });
    } catch (error) {
        console.error("Error creating project:", error);
        return res.status(500).json({ success: false, message: "Server error during project initiation." });
    }
};

// 1.2. Get all ongoing projects
exports.getActiveProjects = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [rows] = await db.execute("SELECT * FROM projects WHERE user_id = ? AND status = 'Active' ORDER BY due_date ASC", [userId]);
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching active projects:", error);
        return res.status(500).json({ message: "Server error fetching active projects." });
    }
};

// 1.3. Permanently purge a project
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute("DELETE FROM projects WHERE id = ?", [id]);
        return res.status(200).json({ success: true, message: "Project purged!" });
    } catch (error) {
        console.error("Error purging project:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// 1.4. Complete and archive a project
exports.completeProject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute("UPDATE projects SET status = 'Completed' WHERE id = ?", [id]);
        return res.status(200).json({ success: true, message: "Project archived successfully!" });
    } catch (error) {
        console.error("Error archiving project:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// 2.1. GET TASKS FILTERED BY ACTIVE PROJECT
exports.getAllTask = async (req, res) => {
    if (!req.session.user || !req.session.user.id) return res.status(401).json([]);
    const userId = req.session.user.id;
    const { projectId } = req.query;
    try {
        if (!projectId) return res.status(200).json([]);
        const sql = "SELECT * FROM tasks WHERE user_id = ? AND project_id = ? ORDER BY due_date ASC";
        const [rows] = await db.execute(sql, [userId, projectId]);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json([]);
    }
};

// 2.2. CREATE NEW TASK UNDER SPECIFIC PROJECT
exports.createNewTask = async (req, res) => {
    try {
        const { title, priority, dueDate, projectId } = req.body;
        const userId = req.session.user.id;
        if (!title || !dueDate || !projectId) {
            return res.status(400).json({ message: "Missing fields!" });
        }
        const sql = 'INSERT INTO tasks (title, priority, due_date, status, user_id, project_id) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [title, priority || 'Medium', dueDate, 'To-Do', userId, projectId]);
        return res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        return res.status(500).json({ message: "Server error." });
    }
};

// 2.3. UPDATE TASK STATUS VIA DRAG & DROP (FIXED KIỂU DỮ LIỆU)
exports.updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Missing status." });
    try {
        const taskId = parseInt(id, 10);
        
        // 1. Thực thi cập nhật trạng thái mới
        const sqlUpdate = "UPDATE tasks SET status = ? WHERE id = ?";
        await db.execute(sqlUpdate, [status, taskId]);

        // 2. 🤖 TỰ ĐỘNG GHI LOG KHI KÉO THẢ: Bắn một dòng lịch sử ngầm xuống bảng task_logs
        const logText = `Completed Time`;
        const sqlLog = "INSERT INTO task_logs (task_id, log_text) VALUES (?, ?)";
        await db.execute(sqlLog, [taskId, logText]);

        return res.status(200).json({ success: true, message: "Status synchronized and logged!" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2.4. DELETE ISOLATED TASK
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: 'Server error.' });
    }
};

// 3.1. Write a new timeline log
exports.createTaskLog = async (req, res) => {
    try {
        const { taskId, logText } = req.body;
        if (!logText || logText.trim() === '') {
            return res.status(400).json({ message: "Content cannot be blank!" });
        }

        const sql = "INSERT INTO task_logs (task_id, log_text) VALUES (?, ?)";
        await db.execute(sql, [taskId, logText.trim()]);

        // ĐỒNG BỘ: Trả về success: true để Frontend biết đường load lại dòng thời gian
        return res.status(201).json({ success: true, message: "Logged successfully!" });
    } catch (error) {
        console.error("Error creating task log:", error);
        return res.status(500).json({ message: "Server error." });
    }
};

// 3.2. Fetch logs
exports.getTaskLogs = async (req, res) => {
    try {
        const { taskId } = req.params;
        const [rows] = await db.execute("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC", [taskId]);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json([]);
    }
};