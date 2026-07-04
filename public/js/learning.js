let stopwatchTimer = null;
let elapsedSeconds = 0;
let currentQuizData = []; // Biến toàn cục lưu cục JSON đề thi từ AI

// Danh sách link nhạc ambient bản quyền miễn phí chạy vòng lặp cực mượt
const AMBIENT_SOURCES = {
    rain: '/audio/dragon-studio-relaxing-rain-444802.mp3',   // Sóng nhạc Acoustic du dương giảm stress
    noise: '/audio/freesound_community-white-noise-50127.mp3',
    lofi: '/audio/freesound_community-grinding-coffee-beans-27938.mp3',   // Nhạc nền Lofi Chill tiết tấu đều đặn tăng tập trung
    forest: '/audio/audiopapkin-forest-ambience-296528.mp3' // Tiếng chim rừng thông
};
let currentActiveSoundType = null;

// 🟢 NÂNG CẤP: Tự động nạp danh sách môn học vào bộ chọn của Đồng hồ khi ứng dụng tải xong
function populateTimerSubjectSelect(subjects) {
    const selectHTML = document.getElementById('timer-subject-select');
    if (!selectHTML) return;
    
    selectHTML.innerHTML = '<option value="">-- Select Subject to Log --</option>';
    subjects.forEach(sub => {
        selectHTML.insertAdjacentHTML('beforeend', `<option value="${sub.name}">${sub.name}</option>`);
    });
}

function startStopwatch() {
    if (stopwatchTimer !== null) return;
    document.getElementById('btn-sw-start').disabled = true;
    document.getElementById('btn-sw-stop').disabled = false;
    stopwatchTimer = setInterval(() => { elapsedSeconds++; updateStopwatchDisplay(); }, 1000);
}

function stopStopwatch() {
    clearInterval(stopwatchTimer); stopwatchTimer = null;
    document.getElementById('btn-sw-start').disabled = false;
    document.getElementById('btn-sw-stop').disabled = true;
}

// 🟢 TÍNH NĂNG ĐẮC GIÁ: RESET ĐỒNG HỒ & TỰ ĐỘNG GỬI LOG XUỐNG MYSQL DOCKER
async function triggerSaveAndResetTimer() {
    stopStopwatch();
    
    const subjectSelect = document.getElementById('timer-subject-select');
    const selectedSubject = subjectSelect ? subjectSelect.value : '';

    // Nếu đã học được từ 5 giây trở lên và có chọn môn học thì tiến hành lưu nhật ký
    if (elapsedSeconds >= 5 && selectedSubject) {
        const minutesSpent = Math.ceil(elapsedSeconds / 60); // Quy đổi số giây học thực tế ra số phút học (làm tròn lên)
        const logActivityMessage = `Studied Course: ${selectedSubject}`;

        try {
            await fetch('/api/learning/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activity: logActivityMessage, duration: minutesSpent })
            });
            alert(`💾 Session saved successfully! Logged ${minutesSpent} mins for ${selectedSubject}.`);
        } catch (err) {
            console.error('❌ Error saving study log:', err);
        }
    } else if (elapsedSeconds >= 5 && !selectedSubject) {
        alert("⚠️ Please select a subject from the dropdown menu to save this study session!");
        document.getElementById('btn-sw-start').disabled = false;
        document.getElementById('btn-sw-stop').disabled = true;
        return; // Chặn không cho reset để Tuấn chọn lại môn học
    }

    // Reset đồng hồ đếm giờ về 0
    elapsedSeconds = 0; 
    updateStopwatchDisplay(); 
}

function resetStopwatch() { 
    stopStopwatch(); 
    elapsedSeconds = 0; 
    updateStopwatchDisplay(); 
}

function updateStopwatchDisplay() {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('stopwatch-display').innerText = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

// 🎧 ENGINE ĐIỀU KHIỂN ÂM THANH NỀN DEEP WORK
function toggleAmbientSound(type) {
    const audioPlayer = document.getElementById('audio-ambient');
    if (!audioPlayer) return;

    // Trả màu sắc tất cả các nút âm thanh về trạng thái tắt mặc định
    ['rain', 'lofi', 'forest'].forEach(t => {
        const btn = document.getElementById(`btn-sound-${t}`);
        if(btn) { btn.style.background = '#fff'; btn.style.color = '#475569'; btn.style.borderColor = '#e2e8f0'; }
    });

    // Nếu bấm lại vào nút đang phát ➔ Tắt nhạc
    if (currentActiveSoundType === type) {
        audioPlayer.pause();
        currentActiveSoundType = null;
        return;
    }

    // Cập nhật nguồn âm thanh và phát nhạc
    audioPlayer.src = AMBIENT_SOURCES[type];
    audioPlayer.play().catch(err => console.log("Audio playback interaction rule:", err));
    currentActiveSoundType = type;

    // Đổi màu nút đang bật sang trạng thái hoạt động (màu xanh dương)
    const activeBtn = document.getElementById(`btn-sound-${type}`);
    if (activeBtn) {
        activeBtn.style.background = '#eff6ff';
        activeBtn.style.color = '#2563eb';
        activeBtn.style.borderColor = '#3b82f6';
    }
}

function switchLearningSubTab(targetPanelId) {
    document.querySelectorAll('.learning-panel').forEach(panel => { panel.style.display = 'none'; });
    const activePanel = document.getElementById(targetPanelId);
    if (activePanel) { 
        activePanel.style.display = (targetPanelId === 'panel-subjects' || targetPanelId === 'panel-quiz') ? 'flex' : 'flex'; 
    }

    document.querySelectorAll('.btn-sub-tab').forEach(btn => {
        if (btn.getAttribute('data-target') === targetPanelId) {
            btn.style.background = '#2563eb'; btn.style.color = 'white';
        } else {
            btn.style.background = 'transparent'; btn.style.color = '#64748b';
        }
    });
}

async function fetchAllSubjects() {
    try {
        const response = await fetch('/api/learning/subjects');
        const subjects = await response.json();
        
        // Kích nổ đổ dữ liệu môn học vào cả bộ chọn của đồng hồ đếm giờ
        populateTimerSubjectSelect(subjects);

        const container = document.getElementById('subjects-list-group');
        if (!container) return;
        container.innerHTML = '';

        subjects.forEach(sub => {
            const btnHTML = `
                <div class="subject-item-wrapper" style="display: flex; align-items: center; gap: 4px; width: 100%;">
                    <button class="subject-menu-btn" data-id="${sub.id}" onclick="selectSubject(${sub.id}, '${sub.name}')"
                            style="flex: 1; text-align: left; padding: 10px; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between;">
                        <span id="sub-text-${sub.id}">📚 ${sub.name}</span>
                    </button>
                    <div style="display: flex; gap: 2px;">
                        <button onclick="inlineEditSubject(event, ${sub.id}, '${sub.name}')" title="Edit" style="background: transparent; border: none; cursor: pointer; padding: 6px; font-size: 13px;">✏️</button>
                        <button onclick="deleteSubjectApi(event, ${sub.id})" title="Delete" style="background: transparent; border: none; cursor: pointer; padding: 6px; font-size: 13px;">❌</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', btnHTML);
        });
    } catch (err) { console.error('Error fetching subjects:', err); }
}

async function selectSubject(id, name) {
    document.getElementById('no-subject-selected').style.display = 'none';
    document.getElementById('subject-detail-content').style.display = 'flex';
    document.getElementById('selected-subject-title').innerText = `Course: ${name}`;
    document.getElementById('selected-subject-id').value = id;

    document.querySelectorAll('.subject-menu-btn').forEach(btn => {
        if(Number(btn.getAttribute('data-id')) === id) {
            btn.style.background = '#eff6ff'; btn.style.borderColor = '#3b82f6'; btn.style.color = '#1d4ed8';
        } else {
            btn.style.background = '#fff'; btn.style.borderColor = '#e2e8f0'; btn.style.color = '#1e293b';
        }
    });
    fetchDocumentsOfSubject(id);
}

async function fetchDocumentsOfSubject(subjectId) {
    try {
        const response = await fetch(`/api/learning/subjects/${subjectId}/documents`);
        const docs = await response.json();
        const tbody = document.getElementById('documents-table-body');
        tbody.innerHTML = '';

        if(docs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color: #94a3b8;">No documents found for this course.</td></tr>`;
            return;
        }

        docs.forEach(doc => {
            const rowHTML = `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-weight: 500; color: #1e293b;">${doc.title}</td>
                    <td style="padding: 10px; display: flex; gap: 8px; justify-content: flex-end;">
                        <a href="${doc.docUrl}" target="_blank" style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; color: #475569; text-decoration: none; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-external-link"></i> View</a>
                        <button onclick="triggerQuizGeneration(${doc.id})" style="padding: 4px 10px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">⚡ Generate Quiz</button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });
    } catch (err) { console.error('Error fetching documents:', err); }
}

// ==========================================================
// 🤖 ENGINE LIÊN KẾT GỌI AI GEMINI & RENDER ĐỀ THI
// ==========================================================

function openTextInputModal(docId) {
    document.getElementById('modal-doc-id').value = docId;
    document.getElementById('modal-extracted-text').value = '';
    document.getElementById('text-input-modal').style.display = 'flex';
}
function closeTextInputModal() {
    document.getElementById('text-input-modal').style.display = 'none';
}

function triggerQuizGeneration(docId) {
    callQuizApi(docId, null, 5);
}

async function submitTextAndGenerateQuiz() {
    const docId = document.getElementById('modal-doc-id').value;
    const textValue = document.getElementById('modal-extracted-text').value;
    if(textValue.trim().length < 10) return alert('Please enter at least 10 characters of content.');
    
    const numQuestions = prompt("How many questions do you want to generate?", "5") || "5";
    
    closeTextInputModal();
    callQuizApi(docId, textValue, numQuestions);
}

async function callQuizApi(docId, manualText, numQuestions = 5) {
    switchLearningSubTab('panel-quiz');
    document.getElementById('quiz-placeholder').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('quiz-loading').style.display = 'block';

    try {
        const response = await fetch('/api/learning/quiz/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: docId, manualText: manualText, numQuestions: Number(numQuestions) })
        });
        const result = await response.json();

        if(result.needText) {
            document.getElementById('quiz-loading').style.display = 'none';
            document.getElementById('quiz-placeholder').style.display = 'block';
            openTextInputModal(docId);
            return;
        }

        if(result.success && result.quiz) {
            currentQuizData = result.quiz;
            renderQuizQuestions(result.quiz);
        } else {
            alert('Failed to build quiz structure. Please try again!');
            resetQuizUI();
        }
    } catch(err) {
        console.error(err);
        alert('Server processing error.');
        resetQuizUI();
    }
}

function resetQuizUI() {
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-placeholder').style.display = 'block';
    document.getElementById('quiz-box').style.display = 'none';
}

function renderQuizQuestions(quizArray) {
    document.getElementById('quiz-loading').style.display = 'none';
    const container = document.getElementById('quiz-questions-container');
    container.innerHTML = '';
    
    document.getElementById('quiz-result-score').style.display = 'none';

    quizArray.forEach((q, qIndex) => {
        let optionsHTML = '';
        q.options.forEach((opt, oIndex) => {
            optionsHTML += `
                <label style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; font-size: 13px;">
                    <input type="radio" name="question-${qIndex}" value="${oIndex}" style="cursor: pointer;">
                    <span>${opt}</span>
                </label>
            `;
        });

        const questionHTML = `
            <div class="quiz-item" id="quiz-item-${qIndex}" style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <span style="font-weight: 700; color: #1e293b; font-size: 14px;">Q${qIndex + 1}: ${q.question}</span>
                <div style="display: flex; flex-direction: column; gap: 6px;">${optionsHTML}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', questionHTML);
    });

    document.getElementById('quiz-box').style.display = 'flex';
}

function submitQuizAnswers() {
    let correctCount = 0;
    const totalQuestions = currentQuizData.length;

    currentQuizData.forEach((q, qIndex) => {
        const selectedRadio = document.querySelector(`input[name="question-${qIndex}"]:checked`);
        const quizItemDiv = document.getElementById(`quiz-item-${qIndex}`);
        
        if(!selectedRadio) {
            quizItemDiv.style.borderColor = '#f59e0b';
            return;
        }

        const answerIndex = Number(selectedRadio.value);

        if(answerIndex === q.correctIndex) {
            correctCount++;
            quizItemDiv.style.borderColor = '#10b981';
            quizItemDiv.style.background = '#f0fdf4';
        } else {
            quizItemDiv.style.borderColor = '#ef4444';
            quizItemDiv.style.background = '#fef2f2';
        }
    });

    const scoreDiv = document.getElementById('quiz-result-score');
    scoreDiv.style.display = 'block';
    scoreDiv.innerText = `Your Score: ${correctCount} / ${totalQuestions} (${Math.round((correctCount/totalQuestions)*100)}%)`;
    scoreDiv.style.background = correctCount === totalQuestions ? '#d1fae5' : '#fee2e2';
    scoreDiv.style.color = correctCount === totalQuestions ? '#065f46' : '#991b1b';
}

async function createNewSubjectApi() {
    const input = document.getElementById('new-subject-name');
    if (!input.value.trim()) return alert('Please enter a course name!');
    try {
        const response = await fetch('/api/learning/subjects');
        const result = await response.json();
        // Giữ nguyên logic xử lý tạo môn
        const postRes = await fetch('/api/learning/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: input.value })
        });
        const postResult = await postRes.json();
        if(postResult.success) { 
            input.value = ''; 
            fetchAllSubjects();
        }
    } catch (err) { console.error('Error creating subject:', err); }
}

async function createNewDocumentApi() {
    const subjectId = document.getElementById('selected-subject-id').value;
    const titleInput = document.getElementById('new-doc-title');
    const urlInput = document.getElementById('new-doc-url');
    
    if (!titleInput.value.trim() || !urlInput.value.trim()) return alert('Please fill in both fields!');
    
    try {
        const response = await fetch('/api/learning/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: subjectId, title: titleInput.value, docUrl: urlInput.value })
        });
        const result = await response.json();
        if(result.success) { 
            titleInput.value = ''; 
            urlInput.value = ''; 
            fetchDocumentsOfSubject(subjectId); 
        }
    } catch (err) { console.error('Error creating document:', err); }
}

// Inline Edit môn học
function inlineEditSubject(event, id, oldName) {
    event.stopPropagation();
    const spanElement = document.getElementById(`sub-text-${id}`);
    if (!spanElement) return;

    spanElement.innerHTML = `<input type="text" id="input-edit-${id}" value="${oldName}" 
        style="font-size: 13px; font-weight: 600; padding: 2px 4px; border: 1px solid #3b82f6; border-radius: 4px; width: 120px; outline: none;">`;
    
    const inputField = document.getElementById(`input-edit-${id}`);
    inputField.focus();
    inputField.select();

    async function saveChange() {
        const newName = inputField.value.trim();
        if (!newName || newName === oldName) {
            spanElement.innerText = `📚 ${oldName}`;
            return;
        }
        try {
            const response = await fetch(`/api/learning/subjects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            const result = await response.json();
            if(result.success) {
                fetchAllSubjects();
                const currentOpenId = document.getElementById('selected-subject-id').value;
                if (Number(currentOpenId) === id) {
                    document.getElementById('selected-subject-title').innerText = `Course: ${newName}`;
                }
            }
        } catch (err) { console.error('Error updating subject:', err); }
    }

    inputField.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveChange(); });
    inputField.addEventListener('blur', saveChange);
}

// Xóa môn học
async function deleteSubjectApi(event, id) {
    event.stopPropagation();
    if (!confirm("⚠️ Are you sure you want to delete this course and ALL its documents?")) return;

    try {
        const response = await fetch(`/api/learning/subjects/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            fetchAllSubjects();
            const currentOpenId = document.getElementById('selected-subject-id').value;
            if (Number(currentOpenId) === id) {
                document.getElementById('no-subject-selected').style.display = 'flex';
                document.getElementById('subject-detail-content').style.display = 'none';
                document.getElementById('selected-subject-id').value = '';
            }
        }
    } catch (err) { console.error('Error deleting subject:', err); }
}

document.addEventListener('DOMContentLoaded', fetchAllSubjects);