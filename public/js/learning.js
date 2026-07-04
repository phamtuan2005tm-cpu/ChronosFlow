let stopwatchTimer = null;
let elapsedSeconds = 0;

function startStopwatch() {
    if (stopwatchTimer !== null) return;
    document.getElementById('btn-sw-start').disabled = true;
    document.getElementById('btn-sw-stop').disabled = false;
    stopwatchTimer = setInterval(() => {
        elapsedSeconds++;
        updateStopwatchDisplay();
    }, 1000);
}

function stopStopwatch() {
    clearInterval(stopwatchTimer);
    stopwatchTimer = null;
    document.getElementById('btn-sw-start').disabled = false;
    document.getElementById('btn-sw-stop').disabled = true;
}

function resetStopwatch() {
    stopStopwatch();
    elapsedSeconds = 0;
    updateStopwatchDisplay();
}

// Hàm chuyển giây thô sang chuỗi hiển thị HH:MM:SS
function formatSecondsToHMS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
    ].join(':');
}

function updateStopwatchDisplay() {
    document.getElementById('stopwatch-display').innerText = formatSecondsToHMS(elapsedSeconds);
}

// 🟢 GỌI API LẤY LỊCH SỬ NHẬT KÝ (QUY ĐỔI GIÂY THÀNH CHUỖI KHI LÊN UI)
async function fetchLearningLogs() {
    try {
        const response = await fetch('/api/learning/logs');
        const logs = await response.json();
        
        const tbody = document.getElementById('learning-logs-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">Bạn chưa có buổi học bấm giờ nào.</td></tr>`;
            return;
        }

        logs.forEach(log => {
            // Chuyển đổi số giây thô lưu từ DB của Tuấn thành chuỗi đẹp để xem
            const displayDuration = formatSecondsToHMS(log.duration);

            const rowHTML = `
                <tr style="border-bottom: 1px solid #f1f5f9; color: #1e293b;">
                    <td style="padding: 10px; color: #64748b; font-size: 12px;">${log.createdAt}</td>
                    <td style="padding: 10px; font-weight: 500;">${log.title}</td>
                    <td style="padding: 10px;"><span style="padding: 2px 6px; background: #eff6ff; color: #2563eb; border-radius: 4px; font-weight: 600; font-family: monospace;">${displayDuration}</span></td>
                    <td style="padding: 10px变量">
                        ${log.doc_url ? `<a href="${log.doc_url}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Mở link</a>` : '<span style="color:#cbd5e1;">-</span>'}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });
    } catch (error) {
        console.error('❌ Lỗi tải bảng lịch sử học tập:', error);
    }
}

// 🔵 GỌI API LƯU NHẬT KÝ (BẮN SỐ GIÂY THÔ LÊN BACKEND)
async function saveLearningLogApi(e) {
    e.preventDefault();

    const titleInput = document.getElementById('log-title');
    const urlInput = document.getElementById('log-url');

    if (elapsedSeconds === 0) {
        return alert('Vui lòng bấm giờ học tập ít nhất 1 giây trước khi lưu nhật ký nhé Tuấn!');
    }

    const payload = {
        title: titleInput.value,
        durationSeconds: elapsedSeconds, // Gửi số nguyên giây thô chuẩn bài
        docUrl: urlInput.value
    };

    try {
        const response = await fetch('/api/learning/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
            titleInput.value = '';
            urlInput.value = '';
            resetStopwatch();
            fetchLearningLogs();
        } else {
            alert('Lỗi hệ thống khi lưu nhật ký buổi học!');
        }
    } catch (error) {
        console.error('❌ Lỗi gửi yêu cầu POST lưu nhật ký:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchLearningLogs();
});
// ==========================================================
// 💡 VÁ LỖI KÍCH NỔ: BẮT SỰ KIỆN SUBMIT FORM LƯU NHẬT KÝ
// ==========================================================
// ==========================================================
// 💡 CƠ CHẾ ỦY QUYỀN SỰ KIỆN: KHẮC PHỤC TRIỆT ĐỂ LỖI SPA / TAB ẨN
// ==========================================================

// Bắt sự kiện submit form trực tiếp từ gốc Document (Form mọc ra lúc nào cũng tóm được)
document.addEventListener('submit', async (e) => {
    // Kiểm tra xem sự kiện submit này có phải là của cái Form lưu nhật ký hay không
    if (e.target && e.target.id === 'learning-log-form') {
        e.preventDefault(); // Chặn tải lại trang

        const titleInput = document.getElementById('log-title');
        const urlInput = document.getElementById('log-url');

        // Bảo hiểm: Chưa học giây nào thì chặn đứng
        if (elapsedSeconds === 0) {
            return alert('Vui lòng bấm giờ học tập ít nhất 1 giây trước khi lưu nhật ký nhé Tuấn!');
        }

        const payload = {
            title: titleInput.value,
            durationSeconds: elapsedSeconds, // Gửi số nguyên giây thô
            docUrl: urlInput.value
        };

        try {
            const response = await fetch('/api/learning/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.success) {
                // Làm sạch form
                titleInput.value = '';
                urlInput.value = '';
                
                // Reset mặt đồng hồ về 0
                resetStopwatch();
                
                // Nạp lại bảng lịch sử bên phải
                fetchLearningLogs();
            } else {
                alert('Lỗi hệ thống khi lưu nhật ký buổi học!');
            }
        } catch (error) {
            console.error('❌ Lỗi gửi yêu cầu POST lưu nhật ký:', error);
        }
    }
});

// Hàm tự động chạy kích nổ tải dữ liệu bảng (Bọc trong try-catch để nếu tab chưa nạp cũng không gây crash)
try {
    fetchLearningLogs();
} catch(e) {}