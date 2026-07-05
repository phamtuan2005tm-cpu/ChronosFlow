let globalMembersCount = 0;
let pendingBillsArray = [];

// 🔄 1. LOAD THÀNH VIÊN KÈM MŨI TÊN ĐẠI SỐ ĐỘNG ĐÚNG BÀI
function loadFinanceMembers() {
    fetch('/api/finance/members')
        .then(res => res.json())
        .then(members => {
            const listContainer = document.getElementById('finance-members-list');
            const peopleCountEl = document.getElementById('split-people-count');
            if (!listContainer) return;

            listContainer.innerHTML = '';
            globalMembersCount = members.length;
            if (peopleCountEl) peopleCountEl.innerText = globalMembersCount;

            if (members.length === 0) {
                listContainer.innerHTML = `<p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 10px 0;">Chưa có thành viên nào.</p>`;
                return;
            }

            members.forEach(member => {
                const totalDebt = parseFloat(member.totalDebt);
                let debtIndicator = '';

                if (totalDebt > 0) {
                    debtIndicator = `<span style="color: #10b981; font-weight: 700;">🔺 +${totalDebt/1000}k</span>`;
                } else if (totalDebt < 0) {
                    debtIndicator = `<span style="color: #ef4444; font-weight: 700;">🔻 ${totalDebt/1000}k</span>`;
                } else {
                    debtIndicator = `<span style="color: #94a3b8; font-size: 11px;">🤝 0đ</span>`;
                }

                const memberHTML = `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s;" 
                         onclick="openDebtModal(${member.id}, '${member.name}')"
                         onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-weight: 700; color: #334155;">👤 ${member.name}</span>
                            <div style="font-size: 11px;">${debtIndicator}</div>
                        </div>
                        <button onclick="event.stopPropagation(); deleteMemberApi(${member.id})" style="border: none; background: transparent; color: #ef4444; cursor: pointer; font-size: 11px; padding: 4px;">❌</button>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', memberHTML);
            });
        })
        .catch(err => console.error('❌ Lỗi:', err));
}

// ➕ 2. THÊM THÀNH VIÊN MỚI
function createNewMemberApi() {
    const nameInput = document.getElementById('new-member-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return alert('Nhập tên trước Tuấn ơi!');

    fetch('/api/finance/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            nameInput.value = ''; 
            loadFinanceMembers();
        } else {
            alert(data.message);
        }
    })
    .catch(err => alert('Lỗi: ' + err.message));
}

// ❌ 3. XÓA THÀNH VIÊN
function deleteMemberApi(id) {
    if (!confirm('Chắc chắn muốn xóa người bạn này không?')) return;
    fetch(`/api/finance/member/${id}`, { method: 'DELETE' }).then(() => loadFinanceMembers());
}

// 🛑 4. CÁC HÀM ĐIỀU KHIỂN MODAL POPUP CHI TIẾT
function openDebtModal(memberId, memberName) {
    document.getElementById('modal-member-id').value = memberId;
    document.getElementById('modal-member-title').innerText = `👤 Nhật ký nợ: ${memberName}`;
    document.getElementById('debt-detail-modal').style.display = 'flex';
    
    fetch(`/api/finance/member-debt/${memberId}`)
        .then(res => res.json())
        .then(history => {
            const tbody = document.getElementById('modal-debt-history-rows');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (history.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#94a3b8;">Chưa từng có giao dịch nợ.</td></tr>`;
                return;
            }

            history.forEach(tx => {
                const time = new Date(tx.created_at).toLocaleDateString('vi-VN') + ' ' + new Date(tx.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                const amount = parseFloat(tx.amount);
                const badge = amount > 0 ? '🔺 Họ nợ mình' : '🔻 Mình nợ họ';
                const color = amount > 0 ? '#10b981' : '#ef4444';

                tbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; color: #64748b;">${time}</td>
                        <td style="padding: 8px; font-weight:600; color: ${color};">${badge}</td>
                        <td style="padding: 8px; font-weight:700; color: ${color};">${Math.abs(amount)/1000}k</td>
                        <td style="padding: 8px; color: #334155;">${tx.note || ''}</td>
                        <td style="padding: 8px; text-align: center;">
                            <button onclick="deleteTransactionApi(${tx.id}, true, ${memberId})" style="border: none; background: transparent; color: #ef4444; cursor: pointer; font-size: 11px;">❌</button>
                        </td>
                    </tr>
                `);
            });
        });
}

function closeDebtModal() {
    document.getElementById('debt-detail-modal').style.display = 'none';
}

function submitModalDebtApi() {
    const memberId = document.getElementById('modal-member-id').value;
    const amountInput = document.getElementById('modal-debt-amount');
    const modeSelect = document.getElementById('modal-debt-mode');
    const noteInput = document.getElementById('modal-debt-note');

    if (!amountInput.value.trim()) return alert('Nhập tiền trước Tuấn ơi!');

    fetch('/api/finance/debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            memberId: memberId,
            amountInput: amountInput.value.trim(),
            mode: modeSelect.value,
            note: noteInput.value.trim()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            amountInput.value = '';
            noteInput.value = '';
            openDebtModal(memberId, document.getElementById('modal-member-title').innerText.replace('👤 Nhật ký nợ: ', ''));
            loadFinanceMembers();
            updateFinanceDashboard();
        }
    });
}

// ➕ 5. HÀM GOM BILL VÀO GIỎ CHỜ CHIA
function addBillToPendingList() {
    const noteInput = document.getElementById('split-bill-note');
    const amountInput = document.getElementById('split-total-bill');
    
    if (!amountInput || !amountInput.value.trim()) {
        alert('Nhập số tiền trước Tuấn ơi!');
        return;
    }

    let rawAmount = 0;
    let clean = amountInput.value.toString().toLowerCase().trim();
    let multiplier = 1;
    if (clean.endsWith('k')) {
        multiplier = 1000;
        clean = clean.slice(0, -1).trim();
    }
    const parsedValue = parseFloat(clean);
    rawAmount = isNaN(parsedValue) ? 0 : Math.round(parsedValue * multiplier);

    if (rawAmount <= 0) {
        alert('Số tiền không hợp lệ!');
        return;
    }

    const noteText = noteInput.value.trim() || `Khoản chi #${pendingBillsArray.length + 1}`;

    pendingBillsArray.push({ note: noteText, amount: rawAmount });
    noteInput.value = '';
    amountInput.value = '';

    renderPendingBillsUI();
}

function renderPendingBillsUI() {
    const zone = document.getElementById('pending-bills-zone'); 
    const listContainer = document.getElementById('pending-bills-list');
    const totalDisplay = document.getElementById('accumulated-total-display');
    const btnClear = document.getElementById('btn-clear-bills');

    if (!zone || !listContainer) return;

    if (pendingBillsArray.length === 0) {
        zone.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none';
        return;
    }

    zone.style.display = 'block';
    if (btnClear) btnClear.style.display = 'block';
    listContainer.innerHTML = '';

    let sum = 0;
    pendingBillsArray.forEach((bill, index) => {
        sum += bill.amount;
        listContainer.insertAdjacentHTML('beforeend', `
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #334155; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 4px;">
                <span>📝 ${bill.note}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-weight: 600; color: #475569;">${bill.amount / 1000}k</span>
                    <button onclick="removeSingleBill(${index})" style="border:none; background:none; color:#ef4444; cursor:pointer; font-size:10px; padding:0 2px;">✕</button>
                </div>
            </div>
        `);
    });

    if (totalDisplay) totalDisplay.innerText = (sum / 1000) + 'k';
}

function removeSingleBill(index) {
    pendingBillsArray.splice(index, 1);
    renderPendingBillsUI();
}

// XÓA HẾT GIỎ BILL
function clearPendingBills() {
    pendingBillsArray = [];
    renderPendingBillsUI();
    const resultBox = document.getElementById('split-result-box');
    if (resultBox) resultBox.style.display = 'none';
}

function calculateEqualSplit() {
    const resultBox = document.getElementById('split-result-box');
    if (!resultBox) return;

    let finalTotalAmount = 0;

    if (pendingBillsArray.length > 0) {
        finalTotalAmount = pendingBillsArray.reduce((acc, curr) => acc + curr.amount, 0);
    } else {
        const amountInput = document.getElementById('split-total-bill');
        if (!amountInput || !amountInput.value.trim()) {
            alert('Hãy nhập số tiền hoặc ấn nút "➕ Gom Bill" để tích lũy nhiều khoản nhé Tuấn!');
            return;
        }
        let clean = amountInput.value.toString().toLowerCase().trim();
        let multiplier = 1;
        if (clean.endsWith('k')) {
            multiplier = 1000;
            clean = clean.slice(0, -1).trim();
        }
        const parsedValue = parseFloat(clean);
        finalTotalAmount = isNaN(parsedValue) ? 0 : Math.round(parsedValue * multiplier);
    }

    const totalPeopleToSplit = globalMembersCount + 1;
    const rawPerPerson = finalTotalAmount / totalPeopleToSplit;
    const roundedPerPerson = Math.ceil(rawPerPerson / 1000) * 1000;

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
        💰 Tổng tiền chốt chia: <span style="font-size:15px; color:#b45309;">${finalTotalAmount / 1000}k</span><br>
        👥 Chia cho: <strong>${totalPeopleToSplit} người</strong> (Tuấn + ${globalMembersCount} bạn)<br>
        💸 Mỗi người cần chuyển: <span style="font-size:16px; color:#10b981;">${roundedPerPerson / 1000}k</span> (đã tròn 1k)
    `;
}

// 📈 THU CHI CÁ NHÂN & TIMELINE LỊCH SỬ
function updateFinanceDashboard() {
    fetch('/api/finance/dashboard-stats')
        .then(res => res.json())
        .then(data => {
            const balanceEl = document.getElementById('total-balance-display');
            if (balanceEl) balanceEl.innerText = data.totalBalanceK;

            const tbody = document.getElementById('finance-timeline-rows');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.timeline.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#94a3b8;">Chưa có lịch sử giao dịch nào.</td></tr>`;
                return;
            }

            data.timeline.forEach(tx => {
                const txTime = new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const isIncome = tx.type === 'income';
                const typeBadge = tx.member_name ? '🤝 Nợ' : (isIncome ? '📈 Thu' : '📉 Chi');
                const amountText = (Math.abs(tx.amount) / 1000) + 'k';
                const amountColor = tx.member_name ? '#b45309' : (isIncome ? '#10b981' : '#ef4444');
                
                // 🎯 VÁ LỖI LOGIC: Định nghĩa dấu cộng trừ hiển thị dòng tiền dựa vào loại Thu/Chi
                const amountSign = isIncome ? '+' : '-';

                tbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 10px; color: #64748b;">${txTime}</td>
                        <td style="padding: 12px 10px; font-weight: 600;">${typeBadge}</td>
                        <td style="padding: 12px 10px; font-weight: 700; color: ${amountColor};">${amountSign}${amountText}</td>
                        <td style="padding: 12px 10px; color: #334155;">${tx.member_name ? `[${tx.member_name}] ` : ''}${tx.note || ''}</td>
                        <td style="padding: 12px 10px; text-align: center;">
                            <button onclick="deleteTransactionApi(${tx.id}, false)" style="border: none; background: transparent; color: #ef4444; cursor: pointer; font-size: 11px; padding: 2px 6px;">❌</button>
                        </td>
                    </tr>
                `);
            });
        });
}

function savePersonalTransactionApi() {
    const amountInput = document.getElementById('tx-amount');
    const typeSelect = document.getElementById('tx-type');
    const noteInput = document.getElementById('tx-note');
    if (!amountInput || !amountInput.value.trim()) return alert('Nhập số tiền trước!');

    fetch('/api/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInput.value.trim(), type: typeSelect.value, note: noteInput.value.trim() })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            amountInput.value = ''; noteInput.value = '';
            updateFinanceDashboard();
            updateMonthlyBudgetProgress();
        }
    });
}

// 🎯 VÁ LỖI LOGIC: BỔ SUNG CỐT LÕI HÀM API XÓA LỊCH SỬ GIAO DỊCH
function deleteTransactionApi(transactionId, isFromModal = false, memberId = null) {
    if (!confirm('Tuấn có chắc chắn muốn xóa lịch sử giao dịch này không?')) return;

    fetch(`/api/finance/transaction/${transactionId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        updateFinanceDashboard();
        updateMonthlyBudgetProgress();
        loadFinanceMembers();

        if (isFromModal && memberId) {
            const currentTitle = document.getElementById('modal-member-title').innerText.replace('👤 Nhật ký nợ: ', '');
            openDebtModal(memberId, currentTitle);
        }
    })
    .catch(err => alert('Lỗi khi xóa giao dịch: ' + err.message));
}

// Khởi chạy kích hoạt khi vào tab
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector('[data-tab="finance"]');
    if (btn) {
        btn.addEventListener('click', () => {
            loadFinanceMembers();
            updateFinanceDashboard();
            updateMonthlyBudgetProgress();
        });
    }
});

// =========================================================================
// 🎯 TÍNH NĂNG 5: ĐIỀU KHIỂN HẠN MỨC THÁNG (BUDGET STRESS ENGINE)
// =========================================================================

function updateMonthlyBudgetProgress() {
    fetch('/api/finance/budget')
        .then(res => res.json())
        .then(data => {
            const progressBar = document.getElementById('budget-progress-bar');
            const statusText = document.getElementById('budget-status-text');
            
            if (!progressBar || !statusText) return;

            const spent = data.spentK;
            const limit = data.limitK;

            let percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            let displayPercent = percent > 100 ? 100 : percent; 
            progressBar.style.width = `${displayPercent}%`;

            if (percent >= 90) {
                progressBar.style.background = '#ef4444'; 
                statusText.innerHTML = `${spent}k / ${limit}k used (<span style="color:#ef4444; font-weight:700;">🚨 Over Budget!</span>)`;
            } else if (percent >= 70) {
                progressBar.style.background = '#f59e0b'; 
                statusText.innerHTML = `${spent}k / ${limit}k used (<span style="color:#f59e0b; font-weight:700;">⚠️ Warning Stress</span>)`;
            } else {
                progressBar.style.background = '#2563eb'; 
                statusText.innerHTML = `${spent}k / ${limit}k used (<span style="color:#10b981; font-weight:700;">✔ Safe</span>)`;
            }
        })
        .catch(err => console.error('❌ Lỗi nạp thanh tiến độ hạn mức:', err));
}

function changeBudgetLimitPrompt() {
    const newLimit = prompt("Tuấn muốn đặt hạn mức chi tiêu cho tháng này là bao nhiêu k? (Ví dụ: 1000k hoặc 2000):");
    if (!newLimit || newLimit.trim() === "") return;

    fetch('/api/finance/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limitInput: newLimit.trim() })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        updateMonthlyBudgetProgress(); 
    })
    .catch(err => alert('Lỗi cài hạn mức: ' + err.message));
}