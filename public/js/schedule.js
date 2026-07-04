// 1. Khởi tạo trạng thái ban đầu của Lịch hệ thống
let currentNavDate = new Date(); // Mặc định lấy ngày hôm nay
let currentCalendarView = 'month'; // Mặc định hiển thị Month View

// Mảng chứa dữ liệu thật hút từ MySQL DB về
let loadedScheduleSlots = [];

// Mảng chứa tên các thứ trong tuần để vẽ hàng tiêu đề
const DAYS_OF_WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// 🟢 HÀM HÚT DỮ LIỆU THẬT TỪ BACK-END MYSQL (ĐÃ ĐỒNG BỘ ĐẦY ĐỦ CÁC TRƯỜNG DỮ LIỆU)
async function fetchSchedulesFromDB() {
    try {
        const response = await fetch('/api/schedules');
        if (!response.ok) throw new Error('Không thể kết nối API lấy lịch');
        
        const rawData = await response.json();
        
        // 💡 BẢO HIỂM DỮ LIỆU: Làm sạch và chuẩn hóa tên trường từ DB lên Front-end
        loadedScheduleSlots = rawData.map(slot => ({
            id: slot.id,
            title: slot.title,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime || '', // Hứng trọn vẹn End Time tránh lỗi undefined
            color: slot.color,
            type: slot.type,
            series_id: slot.series_id || slot.seriesId || null // Đảm bảo giữ chắc chắn series_id nhóm
        }));
        
        // Cập nhật xong dữ liệu -> Kích nổ vẽ giao diện ngay lập tức
        renderCalendarDashboard();
    } catch (error) {
        console.error('❌ Lỗi Front-end khi fetch lịch trình:', error);
    }
}

// Hàm bổ trợ cơ học quy đổi mã Màu lưu từ DB ngược lại thành Tên Category để khớp bộ lọc checkbox
function getCategoryByColor(hexColor) {
    if (hexColor === '#ef4444') return 'work';
    if (hexColor === '#10b981') return 'personal';
    return 'learning'; // Mặc định hoặc `#2563eb`
}

// 🔴 HÀM GỌI API XÓA LỊCH TRÌNH THEO CHẾ ĐỘ (ĐÃ THÔNG LUỒNG NHẬN DIỆN CHUỖI LẶP)
async function deleteScheduleSlot(slotId) {
    // Ép kiểu slotId về Number để tìm kiếm chính xác trong mảng JSON
    const targetSlot = loadedScheduleSlots.find(s => Number(s.id) === Number(slotId));
    let deleteMode = 'single';

    // Đọc mã nhóm series_id đã làm sạch
    const actualSeriesId = targetSlot ? targetSlot.series_id : null;

    if (actualSeriesId !== null && actualSeriesId !== undefined && actualSeriesId !== '') {
        // Nếu tồn tại nhóm series_id -> Kích nổ hộp thoại hỏi chuỗi lặp nâng cao
        const confirmAll = confirm("Lịch trình này thuộc một chuỗi lịch lặp.\n\n- Bấm [OK] để XÓA TOÀN BỘ CHUỖI LỊCH LẶP.\n- Bấm [Cancel] để CHỈ XÓA MỘT Ô NÀY.");
        if (confirmAll) {
            deleteMode = 'all';
        } else {
            const confirmSingle = confirm("Tuấn có muốn CHỈ XÓA DUY NHẤT một ô lịch của ngày này không?");
            if (!confirmSingle) return; // Hủy lệnh, không làm gì cả
            deleteMode = 'single';
        }
    } else {
        // Nếu là lịch đơn lẻ thông thường
        if (!confirm('Tuấn có chắc chắn muốn xóa mốc lịch trình này không?')) return;
    }

    try {
        // Bắn chính xác tham số mode (all hoặc single) lên cổng API
        const response = await fetch(`/api/schedules/${slotId}?mode=${deleteMode}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            fetchSchedulesFromDB(); // Xóa xong nạp lại bảng ngay lập tức
        } else {
            alert('Lỗi khi xóa lịch trình từ hệ thống: ' + (result.message || 'Trục trặc'));
        }
    } catch (error) {
        console.error('❌ Lỗi Front-end khi gửi yêu cầu xóa:', error);
    }
}

// Hàm tạo cấu trúc thanh lịch trình có tích hợp sẵn nút xóa (Dùng chung cho các View)
function createSlotBarElement(slot, displayText, activeCategories) {
    const categoryType = getCategoryByColor(slot.color);
    if (!activeCategories.includes(categoryType)) return null;

    const slotBar = document.createElement('div');
    slotBar.style.background = slot.color || '#2563eb';
    slotBar.style.color = 'white';
    slotBar.style.padding = '2px 6px';
    slotBar.style.borderRadius = '4px';
    slotBar.style.fontSize = '11px';
    slotBar.style.fontWeight = '500';
    slotBar.style.display = 'flex';
    slotBar.style.justifyContent = 'space-between';
    slotBar.style.alignItems = 'center';
    slotBar.style.gap = '4px';
    slotBar.style.minHeight = '18px';

    // Thẻ chứa Text tiêu đề lịch
    const textSpan = document.createElement('span');
    textSpan.innerText = displayText;
    textSpan.style.overflow = 'hidden';
    textSpan.style.textOverflow = 'ellipsis';
    textSpan.style.whiteSpace = 'nowrap';
    textSpan.style.flex = '1';
    
    // 💡 PHƯƠNG ÁN 3: Lắng nghe click vào chữ để mở cửa sổ Modal xem chi tiết/sửa đổi
    textSpan.style.cursor = 'pointer';
    textSpan.addEventListener('click', (e) => {
        e.stopPropagation(); // Chặn lan truyền ra ô ngày ngoài
        openScheduleModal(slot);
    });
    
    slotBar.appendChild(textSpan);

    // Nút xóa nhỏ gọn (×) nằm góc phải thanh màu
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.border = 'none';
    deleteBtn.style.color = 'white';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '13px';
    deleteBtn.style.fontWeight = '700';
    deleteBtn.style.padding = '0 2px';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';

    // Bắt sự kiện click nút xóa
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Ngăn sự kiện click bị nhảy lan ra ngoài ô ngày
        deleteScheduleSlot(slot.id);
    });

    slotBar.appendChild(deleteBtn);
    return slotBar;
}

// 2. Hàm kích nổ chính - Vẽ lại toàn bộ giao diện dựa trên tháng/năm hiện tại
function renderCalendarDashboard() {
    const boardContent = document.getElementById('schedule-board-content');
    const viewTitle = document.getElementById('calendar-view-title');
    
    if (!boardContent) return;
    boardContent.innerHTML = ''; // Quét sạch lưới cũ để vẽ lưới mới

    const year = currentNavDate.getFullYear();
    const month = currentNavDate.getMonth(); // 0 - 11

    // Cập nhật dòng chữ hiển thị Tháng/Năm trên thanh điều hướng
    if (viewTitle) {
        viewTitle.innerText = `Tháng ${month + 1}, ${year}`;
    }

    // Lấy danh sách các category được tích checkbox để lọc động
    const activeCategories = Array.from(document.querySelectorAll('.filter-cate:checked')).map(cb => cb.value);

    // ==========================================
    // 🗓️ CHẾ ĐỘ XEM: MONTH VIEW (XEM THEO THÁNG)
    // ==========================================
    if (currentCalendarView === 'month') {
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
        gridContainer.style.borderTop = '1px solid #e2e8f0';
        gridContainer.style.borderLeft = '1px solid #e2e8f0';

        // Bước A: Vẽ hàng tiêu đề Thứ (T2 -> CN)
        DAYS_OF_WEEK_LABELS.forEach(dayText => {
            const headerCell = document.createElement('div');
            headerCell.innerText = dayText;
            headerCell.style.padding = '10px';
            headerCell.style.background = '#f8fafc';
            headerCell.style.textAlign = 'center';
            headerCell.style.fontWeight = '700';
            headerCell.style.fontSize = '13px';
            headerCell.style.color = '#475569';
            headerCell.style.borderRight = '1px solid #e2e8f0';
            headerCell.style.borderBottom = '1px solid #e2e8f0';
            gridContainer.appendChild(headerCell);
        });

        // Bước B: Tính toán thuật toán ngày tháng vật lý
        const firstDayOfMonth = new Date(year, month, 1);
        let firstDayIndex = firstDayOfMonth.getDay() - 1; 
        if (firstDayIndex === -1) firstDayIndex = 6; 

        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

        // Bước C: Vẽ các ô trống đệm của tháng trước
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.style.padding = '10px';
            emptyCell.style.minHeight = '90px';
            emptyCell.style.background = '#fafafa';
            emptyCell.style.borderRight = '1px solid #e2e8f0';
            emptyCell.style.borderBottom = '1px solid #e2e8f0';
            gridContainer.appendChild(emptyCell);
        }

        // Bước D: Vẽ đầy đủ các ngày thực tế từ 1 đến 31 của tháng
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.style.padding = '8px';
            
            dayCell.style.height = '100px'; 
            dayCell.style.maxHeight = '100px'; 

            dayCell.style.background = '#fff';
            dayCell.style.borderRight = '1px solid #e2e8f0';
            dayCell.style.borderBottom = '1px solid #e2e8f0';
            dayCell.style.display = 'flex';
            dayCell.style.flexDirection = 'column';
            dayCell.style.gap = '4px';
            dayCell.style.position = 'relative';
            dayCell.style.overflowY = 'auto';

            const dayNumberSpan = document.createElement('span');
            dayNumberSpan.innerText = day;
            dayNumberSpan.style.fontSize = '12px';
            dayNumberSpan.style.fontWeight = '600';
            dayNumberSpan.style.color = '#64748b';
            dayCell.appendChild(dayNumberSpan);

            const currentCellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const todayStr = new Date().toISOString().split('T')[0];
            if (currentCellDateStr === todayStr) {
                dayCell.style.background = '#fef08a'; 
            }

            // 💡 PHƯƠNG ÁN 2: Bấm vào khoảng trống ô ngày để mở nhanh Form thêm
            dayCell.style.cursor = 'pointer';
            dayCell.addEventListener('click', (e) => {
                if (e.target === dayCell || e.target.tagName === 'SPAN') {
                    const formCard = document.getElementById('schedule-form-card');
                    if (!formCard || formCard.style.display === 'none' || formCard.style.display === '') {
                        toggleScheduleForm();
                    }
                    const inputDate = document.getElementById('sched-date');
                    if (inputDate) {
                        inputDate.value = currentCellDateStr;
                    }
                }
            });

            // Bước E: Lọc và vẽ thanh lịch trình lên Month View
            const daySlots = loadedScheduleSlots.filter(slot => slot.date === currentCellDateStr);
            
            daySlots.forEach(slot => {
                const slotBar = createSlotBarElement(slot, `${slot.startTime} ${slot.title}`, activeCategories);
                if (slotBar) {
                    dayCell.appendChild(slotBar);
                }
            });

            gridContainer.appendChild(dayCell);
            // ==========================================================
            // 💡 BƯỚC 2: CLICK Ô TRỐNG NGÀY ĐỂ MỞ FORM & ĐIỀN SẴN NGÀY
            // ==========================================================
            dayCell.style.cursor = 'pointer';
            dayCell.addEventListener('click', (e) => {
                // Chỉ kích hoạt nếu nhấp trúng khoảng trống của ô hoặc số ngày (thẻ SPAN)
                // Chặn hoàn toàn nếu người dùng click trúng các thanh lịch trình slotBar bên trong
                if (e.target === dayCell || e.target.tagName === 'SPAN') {
                    const formCard = document.getElementById('schedule-form-card');
                    
                    // 1. Nếu form thêm lịch đang đóng, tự động kích nổ mở form ra liền
                    if (!formCard || formCard.style.display === 'none' || formCard.style.display === '') {
                        toggleScheduleForm();
                    }
                    
                    // 2. Điền tự động chuỗi ngày YYYY-MM-DD của ô đó vào input 'sched-date'
                    const inputDate = document.getElementById('sched-date');
                    if (inputDate) {
                        inputDate.value = currentCellDateStr;
                    }
                }
            });

            gridContainer.appendChild(dayCell); // (Đây là dòng code kết thúc vòng lặp sẵn có của Tuấn)
        }
        boardContent.appendChild(gridContainer);

    // ==========================================
    // 🗓️ CHẾ ĐỘ XEM: WEEK VIEW (XEM THEO TUẦN)
    // ==========================================
    } else if (currentCalendarView === 'week') {
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = '80px repeat(7, minmax(0, 1fr))'; 
        gridContainer.style.borderTop = '1px solid #e2e8f0';
        gridContainer.style.borderLeft = '1px solid #e2e8f0';

        const currentDayOfWeek = currentNavDate.getDay();
        const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const mondayOfWeek = new Date(currentNavDate);
        mondayOfWeek.setDate(currentNavDate.getDate() + distanceToMonday);

        const cornerCell = document.createElement('div');
        cornerCell.style.background = '#f8fafc';
        cornerCell.style.borderRight = '1px solid #e2e8f0';
        cornerCell.style.borderBottom = '1px solid #e2e8f0';
        gridContainer.appendChild(cornerCell);

        const weekDaysStrArr = [];

        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(mondayOfWeek);
            tempDate.setDate(mondayOfWeek.getDate() + i);
            const dateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
            weekDaysStrArr.push(dateStr);

            const dayHeader = document.createElement('div');
            dayHeader.innerHTML = `<div style="font-weight:700; color:#475569;">${DAYS_OF_WEEK_LABELS[i]}</div>
                                   <div style="font-size:11px; color:#64748b;">${tempDate.getDate()}/${tempDate.getMonth()+1}</div>`;
            dayHeader.style.padding = '8px';
            dayHeader.style.background = '#f8fafc';
            dayHeader.style.textAlign = 'center';
            dayHeader.style.borderRight = '1px solid #e2e8f0';
            dayHeader.style.borderBottom = '1px solid #e2e8f0';
            
            const todayStr = new Date().toISOString().split('T')[0];
            if (dateStr === todayStr) dayHeader.style.background = '#fef08a';

            gridContainer.appendChild(dayHeader);
        }

        for (let hour = 6; hour <= 22; hour++) {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;

            const timeCell = document.createElement('div');
            timeCell.innerText = timeStr;
            timeCell.style.padding = '8px';
            timeCell.style.fontSize = '12px';
            timeCell.style.fontWeight = '600';
            timeCell.style.color = '#64748b';
            timeCell.style.background = '#f8fafc';
            timeCell.style.borderRight = '1px solid #e2e8f0';
            timeCell.style.borderBottom = '1px solid #e2e8f0';
            timeCell.style.textAlign = 'center';
            gridContainer.appendChild(timeCell);

            for (let d = 0; d < 7; d++) {
                const targetDateStr = weekDaysStrArr[d];
                const hourCell = document.createElement('div');
                hourCell.style.padding = '4px';
                hourCell.style.minHeight = '50px';
                hourCell.style.borderRight = '1px solid #e2e8f0';
                hourCell.style.borderBottom = '1px solid #e2e8f0';
                hourCell.style.background = '#fff';
                hourCell.style.display = 'flex';
                hourCell.style.flexDirection = 'column';
                hourCell.style.gap = '2px';

                const slotsMatched = loadedScheduleSlots.filter(slot => 
                    slot.date === targetDateStr && slot.startTime.split(':')[0] == hour
                );

                slotsMatched.forEach(slot => {
                    const slotBar = createSlotBarElement(slot, slot.title, activeCategories);
                    if (slotBar) {
                        slotBar.style.width = '100%';
                        hourCell.appendChild(slotBar); 
                    }
                });

                gridContainer.appendChild(hourCell);
            }
        }
        boardContent.appendChild(gridContainer);

    // ==========================================
    // ☀️ CHẾ ĐỘ XEM: DAY VIEW (XEM THEO NGÀY)
    // ==========================================
    } else if (currentCalendarView === 'day') {
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = '80px 1fr';
        gridContainer.style.borderTop = '1px solid #e2e8f0';
        gridContainer.style.borderLeft = '1px solid #e2e8f0';

        const targetDateStr = `${currentNavDate.getFullYear()}-${String(currentNavDate.getMonth() + 1).padStart(2, '0')}-${String(currentNavDate.getDate()).padStart(2, '0')}`;

        for (let hour = 6; hour <= 22; hour++) {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;

            const timeCell = document.createElement('div');
            timeCell.innerText = timeStr;
            timeCell.style.padding = '12px 8px';
            timeCell.style.fontSize = '12px';
            timeCell.style.fontWeight = '600';
            timeCell.style.color = '#64748b';
            timeCell.style.background = '#f8fafc';
            timeCell.style.borderRight = '1px solid #e2e8f0';
            timeCell.style.borderBottom = '1px solid #e2e8f0';
            timeCell.style.textAlign = 'center';
            gridContainer.appendChild(timeCell);

            const contentCell = document.createElement('div');
            contentCell.style.padding = '6px';
            contentCell.style.borderRight = '1px solid #e2e8f0';
            contentCell.style.borderBottom = '1px solid #e2e8f0';
            contentCell.style.background = '#fff';
            contentCell.style.display = 'flex';
            contentCell.style.flexDirection = 'column';
            contentCell.style.gap = '4px';

            const slotsMatched = loadedScheduleSlots.filter(slot => 
                slot.date === targetDateStr && slot.startTime.split(':')[0] == hour
            );

            slotsMatched.forEach(slot => {
                const slotBar = createSlotBarElement(slot, `${slot.startTime} - ${slot.title}`, activeCategories);
                if (slotBar) {
                    contentCell.appendChild(slotBar);
                }
            });

            gridContainer.appendChild(contentCell);
        }
        boardContent.appendChild(gridContainer);
    }
}

// 3. CÁC HÀM ĐIỀU HƯỚNG THỜI GIAN
function navigateTime(direction) {
    if (currentCalendarView === 'month') {
        currentNavDate.setMonth(currentNavDate.getMonth() + direction);
    } else if (currentCalendarView === 'week') {
        currentNavDate.setDate(currentNavDate.getDate() + (direction * 7));
    } else {
        currentNavDate.setDate(currentNavDate.getDate() + direction);
    }
    renderCalendarDashboard(); 
}

function jumpToToday() {
    currentNavDate = new Date();
    renderCalendarDashboard();
}

// Hàm bổ trợ bật tắt form cơ học
function toggleScheduleForm() {
    const formCard = document.getElementById('schedule-form-card');
    const btnToggle = document.getElementById('btn-toggle-form');
    if (!formCard || !btnToggle) return;
    if (formCard.style.display === 'none' || formCard.style.display === '') {
        formCard.style.display = 'block';
        btnToggle.innerHTML = `<i class="fa-solid fa-xmark"></i> Close Form`;
        btnToggle.style.background = '#64748b';
    } else {
        formCard.style.display = 'none';
        btnToggle.innerHTML = `<i class="fa-solid fa-plus"></i> Add New Slot`;
        btnToggle.style.background = '#2563eb';
    }
}

function switchView(viewMode) {
    currentCalendarView = viewMode;
    document.querySelectorAll('.btn-view').forEach(btn => {
        if (btn.getAttribute('data-view') === viewMode) {
            btn.style.background = '#fff';
            btn.style.color = '#1e293b';
            btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#475569';
            btn.style.boxShadow = 'none';
        }
    });
    renderCalendarDashboard();
}

// 4. ĐỒNG HỒ LIVE CLOCK THỜI GIAN THỰC
function startLiveClockEngine() {
    setInterval(() => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        const dateEles = document.getElementById('live-date');
        const timeEles = document.getElementById('live-time');
        
        if (dateEles) dateEles.innerText = now.toLocaleDateString('en-US', options);
        if (timeEles) timeEles.innerText = now.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
}

// 💡 CÁC HÀM XỬ LÝ POPUP MODAL XEM CHI TIẾT & CẬP NHẬT TÊN LỊCH TRÌNH
function openScheduleModal(slot) {
    document.getElementById('modal-slot-id').value = slot.id;
    document.getElementById('modal-slot-title').value = slot.title;
    document.getElementById('modal-slot-start').value = slot.startTime;
    document.getElementById('modal-slot-end').value = slot.endTime || '';
    
    document.getElementById('schedule-detail-modal').style.display = 'flex';
}

function closeScheduleModal() {
    document.getElementById('schedule-detail-modal').style.display = 'none';
}

async function updateScheduleTitleApi() {
    const slotId = document.getElementById('modal-slot-id').value;
    const newTitle = document.getElementById('modal-slot-title').value;

    if (!newTitle.trim()) return alert("Vui lòng nhập tên hoạt động!");

    try {
        const response = await fetch(`/api/schedules/${slotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        });

        const result = await response.json();
        if (result.success) {
            closeScheduleModal();
            fetchSchedulesFromDB(); 
        } else {
            alert('Lỗi khi cập nhật lịch trình!');
        }
    } catch (error) {
        console.error('❌ Lỗi gửi yêu cầu cập nhật lên API:', error);
    }
}

// 5. BẮT SỰ KIỆN SUBMIT FORM - ĐẨY DỮ LIỆU KÈM THEO MẢNG CHẾ ĐỘ LẶP LÊN API
function setupFormSubmitListener() {
    const form = document.getElementById('schedule-creation-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const selectedDays = Array.from(document.querySelectorAll('.btn-day-checkbox.active-day'))
                                  .map(btn => parseInt(btn.getAttribute('data-day')));

        const payload = {
            title: document.getElementById('sched-title').value,
            date: document.getElementById('sched-date').value,
            startTime: document.getElementById('sched-start-time').value,
            endTime: document.getElementById('sched-end-time').value,
            category: document.getElementById('sched-category').value,
            type: document.getElementById('sched-type').value, 
            repeatUntil: document.getElementById('sched-repeat-until').value,
            repeatDays: selectedDays 
        };

        try {
            const response = await fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                form.reset(); 
                
                document.querySelectorAll('.btn-day-checkbox').forEach(b => {
                    b.style.background = '#fff';
                    b.style.color = '#475569';
                    b.classList.remove('active-day');
                });

                toggleScheduleForm(); 
                fetchSchedulesFromDB(); 
            } else {
                alert('Lỗi hệ thống khi lưu lịch trình!');
            }
        } catch (error) {
            console.error('❌ Lỗi gửi form lên API:', error);
        }
    });
}

// 6. KHỞI ĐỘNG HỆ THỐNG KHI TẢI TRANG
document.addEventListener('DOMContentLoaded', () => {
    startLiveClockEngine();
    fetchSchedulesFromDB(); 
    setupFormSubmitListener(); 

    document.querySelectorAll('.btn-day-checkbox').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active-day');
            if (button.classList.contains('active-day')) {
                button.style.background = '#2563eb'; 
                button.style.color = '#fff';
            } else {
                button.style.background = '#fff';
                button.style.color = '#475569';
            }
        });
    });

    document.querySelectorAll('.filter-cate').forEach(checkbox => {
        checkbox.addEventListener('change', renderCalendarDashboard);
    });
});