window.activeProjectId = null;

// LOAD PROJECTS
window.loadActiveProjects = function() {
    console.log("🔄 Fetching active projects...");
    fetch('/api/projects')
        .then(res => res.json())
        .then(projects => {
            const grid = document.getElementById('project-list-grid');
            if (!grid) return;
            grid.innerHTML = '';

            if (!projects || projects.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #94a3b8;">🎯 No ongoing projects found.</div>`;
                return;
            }

            projects.forEach(proj => {
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                const end = proj.due_date ? new Date(proj.due_date).toLocaleDateString('en-US', options) : 'N/A';
                let badgeColor = '#64748b'; let badgeBg = '#f1f5f9';
                if (proj.priority === 'High') { badgeColor = '#ef4444'; badgeBg = '#ffeeef'; }
                else if (proj.priority === 'Medium') { badgeColor = '#d97706'; badgeBg = '#fffbeb'; }

                const safeName = (proj.name || 'Untitled').replace(/'/g, "\\'");
                const cardHTML = `
                    <div class="project-card" onclick="window.openProjectWorkspace(${proj.id}, '${safeName}')" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; cursor: pointer; position: relative;">
                        <span style="position: absolute; top: 15px; right: 15px; font-size: 11px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; padding: 3px 8px; border-radius: 12px;">${proj.priority || 'Medium'}</span>
                        <h4 style="margin: 0 0 10px 0; color: #1e293b;">📁 ${proj.name}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; font-size: 12px;">
                            <span>⏳ Due: <strong>${end}</strong></span>
                            <button onclick="event.stopPropagation(); window.deleteProjectApi(${proj.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer;">🗑️ Delete</button>
                        </div>
                    </div>`;
                grid.insertAdjacentHTML('beforeend', cardHTML);
            });
        }).catch(err => console.error(err));
};

// SUBMIT PROJECT
window.submitProjectManually = function() {
    const name = document.getElementById('proj-name').value.trim();
    const priority = document.getElementById('proj-priority').value;
    const startDate = document.getElementById('proj-startdate').value;
    const endDate = document.getElementById('proj-enddate').value;

    if (!name || !startDate || !endDate) {
        alert("Please fill in all fields Tuấn ơi!");
        return;
    }

    fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, priority, startDate, dueDate: endDate })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('proj-name').value = '';
            document.getElementById('proj-startdate').value = '';
            document.getElementById('proj-enddate').value = '';
            window.loadActiveProjects(); 
        } else {
            alert(data.message);
        }
    }).catch(err => alert('Error: ' + err.message));
};

// WORKSPACE NAVIGATION
window.openProjectWorkspace = function(projectId, projectName) {
    window.activeProjectId = projectId;
    document.getElementById('active-project-id').value = projectId;
    document.getElementById('txt-active-project-name').innerText = projectName;
    document.getElementById('project-hub-zone').style.display = 'none';
    document.getElementById('active-project-workspace').style.display = 'block';
    
    const btnZone = document.getElementById('project-action-buttons-zone');
    if (btnZone) {
        btnZone.innerHTML = `
            <button onclick="window.completeProjectApi(${projectId})" style="background: #10b981; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; margin-right: 10px;">🏆 Complete Project</button>
            <button onclick="window.deleteProjectApi(${projectId}, true)" style="background: #ef4444; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">🗑️ Abort Project</button>`;
    }
    window.loadKanbanBoard(projectId);
};

window.backToProjectHub = function() {
    window.activeProjectId = null;
    document.getElementById('active-project-workspace').style.display = 'none';
    document.getElementById('project-hub-zone').style.display = 'block';
    window.loadActiveProjects();
};

// LOAD KANBAN BOARD
window.loadKanbanBoard = function(projectId) {
    console.log("📊 Loading Kanban tasks for project ID:", projectId);
    fetch(`/api/tasks?projectId=${projectId}`)
        .then(res => res.json())
        .then(tasks => {
            const listTodo = document.getElementById('list-todo');
            const listProgress = document.getElementById('list-progress');
            const listDone = document.getElementById('list-done');
            if (!listTodo || !listProgress || !listDone) return;
            
            listTodo.innerHTML = ''; listProgress.innerHTML = ''; listDone.innerHTML = '';
            let todoCount = 0; let progressCount = 0; let doneCount = 0;

            if (!Array.isArray(tasks)) tasks = [];

            tasks.forEach(task => {
                // Ép tên mức độ về chữ thường (high, medium, low) để khớp với Class CSS
                const priorityClass = (task.priority || 'Medium').toLowerCase();

                const cardHTML = `
                    <div class="task-card priority-${priorityClass}" draggable="true" ondragstart="window.handleDragStart(event, ${task.id})" onclick="window.openTaskDetailModal(${task.id}, '${task.title.replace(/'/g, "\\'")}', '${task.status}', '${task.due_date}')">
                        <div>
                            <p style="margin:0; font-weight:600; color:#1e293b; font-size:14px;">${task.title}</p>
                            <span class="badge-priority">⭐ ${task.priority || 'Medium'}</span>
                        </div>
                        <button onclick="event.stopPropagation(); window.deleteCancelTask(${task.id})" style="border:none; background:transparent; color:#94a3b8; cursor:pointer;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">✕</button>
                    </div>`;

                if (task.status === 'To-Do') { listTodo.insertAdjacentHTML('beforeend', cardHTML); todoCount++; }
                else if (task.status === 'In Progress') { listProgress.insertAdjacentHTML('beforeend', cardHTML); progressCount++; }
                else if (task.status === 'Done') { listDone.insertAdjacentHTML('beforeend', cardHTML); doneCount++; }
            });
            document.getElementById('count-todo').innerText = todoCount;
            document.getElementById('count-progress').innerText = progressCount;
            document.getElementById('count-done').innerText = doneCount;
        }).catch(err => console.error(err));
};

// CREATE TASK
window.createNewTaskApi = function() {
    const titleInput = document.getElementById('task-title');
    const dueDateInput = document.getElementById('task-duedate');
    const priority = document.getElementById('task-priority').value;
    const projectId = window.activeProjectId; 

    if (!titleInput || !dueDateInput || !projectId) return;
    const title = titleInput.value.trim();
    const dueDate = dueDateInput.value;

    if (!title || !dueDate) {
        alert("Please input task title and specify due date!");
        return;
    }

    fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, dueDate, projectId })
    })
    .then(res => res.json())
    .then(() => {
        titleInput.value = '';
        dueDateInput.value = '';
        window.loadKanbanBoard(projectId);
    }).catch(err => alert(err.message));
};

// DRAG AND DROP HANDLERS
// ĐẢM BẢO KHAI BÁO CÓ CHỮ WINDOW Ở TRƯỚC CÁC HÀM KÉO THẢ NÀY TRONG FILE tasks.js
window.allowDrop = function(ev) { 
    ev.preventDefault(); 
};

window.handleDragStart = function(ev, taskId) { 
    ev.dataTransfer.setData("text/plain", taskId); 
};

window.handleDrop = function(ev, newStatus) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text/plain");
    const projectId = window.activeProjectId;
    if (!taskId) return;

    fetch(`/api/task/${parseInt(taskId, 10)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => {
        if (!res.ok) throw new Error("Server rejected.");
        return res.json();
    })
    .then(data => {
        if (data.success) window.loadKanbanBoard(projectId);
        else alert("Lỗi chuyển cột cơ học!");
    })
    .catch(err => console.error("🚨 Lỗi kéo thả:", err));
};

window.deleteCancelTask = function(id) {
    if (!confirm("Vaporize this task?")) return;
    fetch(`/api/task/${id}`, { method: 'DELETE' }).then(() => window.loadKanbanBoard(window.activeProjectId));
};

// TASK DETAILS LOGS
window.openTaskDetailModal = function(id, title, status, dueDate) {
    document.getElementById('modal-active-task-id').value = id;
    document.getElementById('modal-task-title').innerText = title;
    document.getElementById('modal-task-status').innerText = status;
    document.getElementById('modal-task-due').innerText = new Date(dueDate).toLocaleString('en-US');
    document.getElementById('task-detail-modal').style.display = 'flex';
    window.loadTaskLogsTimeline(id);
};

window.closeTaskDetailModal = function() { document.getElementById('task-detail-modal').style.display = 'none'; };

window.loadTaskLogsTimeline = function(taskId) {
    // 🛑 CHÚ Ý: Sử dụng /api/task (số ít) để khớp với router.get('/task/:taskId/logs')
    fetch(`/api/task/${taskId}/logs`)
        .then(res => res.json())
        .then(logs => {
            const container = document.getElementById('task-logs-timeline');
            if (!container) return;
            container.innerHTML = '';
            if (logs.length === 0) {
                container.innerHTML = `<p style="font-size:12px; color:#94a3b8; text-align:center;">No history recorded.</p>`;
                return;
            }
            logs.forEach(log => {
                const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                container.insertAdjacentHTML('beforeend', `
                    <div style="background:#f8fafc; padding:8px 12px; border-radius:6px; font-size:12px; border-left:3px solid #10b981; margin-bottom:5px;">
                        <span style="font-weight:700; color:#64748b;">[${time}]</span> <span>${log.log_text}</span>
                    </div>`);
            });
        }).catch(err => console.error("🚨 Lỗi nạp log:", err));
};

window.submitTaskLogApi = function() {
    const taskId = document.getElementById('modal-active-task-id').value;
    const input = document.getElementById('task-log-input');
    if (!input) return;
    
    const logText = input.value.trim();
    if (!logText) {
        alert("Tuấn ơi, vui lòng nhập nội dung bước tiến độ trước khi bấm lưu nhé!");
        return;
    }

    fetch('/api/task/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, logText })
    })
    .then(res => {
        if (!res.ok) throw new Error("Server rejected logging payload.");
        return res.json();
    })
    .then(data => {
        if (data.success) {
            console.log("📝 Log step injected successfully into timeline!");
            input.value = ''; // Dọn sạch ô gõ chữ
            window.loadTaskLogsTimeline(taskId); // Ép dòng thời gian nạp lại tức thì
        }
    })
    .catch(err => {
        console.error("🚨 Log submit crash:", err);
        alert("Lỗi ghi nhận tiến độ: " + err.message);
    });
};

window.deleteProjectApi = function(id, isFromWorkspace = false) {
    if (!confirm('Purge project data?')) return;
    fetch(`/api/project/${id}`, { method: 'DELETE' }).then(() => isFromWorkspace ? window.backToProjectHub() : window.loadActiveProjects());
};

window.completeProjectApi = function(id) {
    if (!confirm('Archive completed project?')) return;
    fetch(`/api/project/${id}/complete`, { method: 'PUT' }).then(() => window.backToProjectHub());
};

document.addEventListener("DOMContentLoaded", () => { window.loadActiveProjects(); });