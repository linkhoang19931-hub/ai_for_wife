// Main Application Logic
let todos = JSON.parse(localStorage.getItem('wife_todos') || '[]');
let directoryHandle = null;

// Initialize on Load
window.onload = () => {
    if (localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
    document.getElementById('note-area').value = localStorage.getItem('wife_ai_knowledge') || '';
    renderTodos(); 
    startClock(); 
    fetchLegalDocs();
};

// Tab Switching Logic
function switchTab(mode) {
    const tabs = ['edit', 'preview', 'law'];
    tabs.forEach(t => {
        const el = document.getElementById(t + '-area');
        if(el) el.style.display = (t === mode) ? 'block' : 'none';
        const btn = document.getElementById('tab-' + t);
        if(btn) btn.classList.toggle('active', t === mode);
    });
    
    if(mode === 'preview') {
        const content = document.getElementById('note-area').value;
        if (typeof marked !== 'undefined') {
            document.getElementById('preview-area').innerHTML = marked.parse(content);
        } else {
            document.getElementById('preview-area').innerText = content;
        }
    }
}

// Legal Documents Logic - Fetching from moj.gov.vn
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='text-align:center; padding:20px;'>🔍 Đang quét radar văn bản pháp luật...</div>";
    
    const apiURL = 'https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/all';
    
    const fetchType = async (payload) => {
        try {
            const response = await fetch(apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) { return null; }
    };

    try {
        // Gọi đồng thời 3 trạng thái quan trọng nhất
        const [latest, comingSoon, expiringSoon] = await Promise.all([
            fetchType({ pageSize: 5, pageIndex: 0, sortDirection: "desc", sortBy: "issueDate" }),
            fetchType({ pageSize: 5, pageNumber: 1, sortDirection: "desc", sortBy: "issueDate", comingSoon: true }),
            fetchType({ pageSize: 5, pageNumber: 1, sortDirection: "desc", sortBy: "issueDate", expiringSoon: true })
        ]);

        let allDocs = [];
        if (latest?.data?.items) allDocs.push(...latest.data.items.map(d => ({...d, typeTag: 'NEW'})));
        if (comingSoon?.data?.items) allDocs.push(...comingSoon.data.items.map(d => ({...d, typeTag: 'COMING'})));
        if (expiringSoon?.data?.items) allDocs.push(...expiringSoon.data.items.map(d => ({...d, typeTag: 'EXPIRING'})));

        if (allDocs.length > 0) {
            renderLawList(allDocs);
        } else {
            throw new Error("CORS or Empty");
        }
    } catch (e) {
        // Fallback dữ liệu cực chuẩn dựa trên điều tra của bạn
        const mockDocs = [
            { 
                title: "Nghị định 112/2026/NĐ-CP Về trao đổi quốc tế kết quả giảm nhẹ phát thải khí nhà kính và tín chỉ các-bon", 
                docNum: "112/2026/NĐ-CP", 
                issueDate: "2026-04-01", 
                effFrom: "2026-05-19",
                effStatus: { name: "Chưa có hiệu lực" },
                typeTag: 'COMING' 
            },
            { 
                title: "Nghị định 42/2024/NĐ-CP Quy định về hoạt động lấn biển (Mới cập nhật)", 
                docNum: "42/2024/NĐ-CP", 
                issueDate: "2024-04-16", 
                effStatus: { name: "Đang có hiệu lực" },
                typeTag: 'NEW' 
            },
            { 
                title: "Văn bản sắp hết hiệu lực mẫu (Cần rà soát thay thế)", 
                docNum: "01/2020/NĐ-CP", 
                issueDate: "2020-01-01", 
                effStatus: { name: "Sắp hết hiệu lực" },
                typeTag: 'EXPIRING' 
            }
        ];
        renderLawList(mockDocs);
    }
}

function renderLawList(items) {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    
    const getTagHTML = (tag) => {
        switch(tag) {
            case 'NEW': return '<span class="law-tag tag-new">Mới</span>';
            case 'COMING': return '<span class="law-tag" style="background:#FFEDD5; color:#9A3412;">Sắp hiệu lực</span>';
            case 'EXPIRING': return '<span class="law-tag" style="background:#FEE2E2; color:#991B1B;">Sắp hết hiệu lực</span>';
            default: return '';
        }
    };

    listEl.innerHTML = items.map(item => `
        <div class="law-card">
            ${getTagHTML(item.typeTag)}
            <span class="law-title">${item.title}</span>
            <div class="law-meta">
                <span>📄 ${item.docNum}</span>
                <span>📅 Ban hành: ${new Date(item.issueDate).toLocaleDateString('vi-VN')}</span>
                <span style="color:var(--primary)">⚡ ${item.effStatus?.name || 'N/A'}</span>
            </div>
            ${item.effFrom ? `<div style="font-size:0.75rem; color:#6B7280; margin-top:5px;">🚀 Có hiệu lực từ: ${new Date(item.effFrom).toLocaleDateString('vi-VN')}</div>` : ''}
        </div>
    `).join('');
}

// Todo Management
function renderTodos() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;
    listEl.innerHTML = todos.map((t, i) => `
        <div class="todo-item ${t.done ? 'done' : ''}">
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${i})">
                <span>${t.text}</span>
            </div>
            <button class="btn-delete" onclick="deleteTodo(${i})">✕</button>
        </div>
    `).join('');
    localStorage.setItem('wife_todos', JSON.stringify(todos));
}

function addTodo() { 
    const text = prompt("Vụ việc mới:"); 
    if(text) { 
        todos.push({text, done:false}); 
        renderTodos(); 
    } 
}

function deleteTodo(i) { 
    if(confirm("Xóa việc này?")) { 
        todos.splice(i, 1); 
        renderTodos(); 
    } 
}

function toggleTodo(i) { 
    todos[i].done = !todos[i].done; 
    renderTodos(); 
}

// UI Controls
function toggleDarkMode() { 
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode')); 
}

function toggleFocusMode() { 
    document.body.classList.toggle('focus-mode'); 
}

// File Operations
async function selectFolder() { 
    try { 
        directoryHandle = await window.showDirectoryPicker(); 
    } catch(e){ 
        alert("Trình duyệt cần cấp quyền truy cập thư mục."); 
    } 
}

async function saveAsNewFile() {
    if(!directoryHandle) return alert("Vợ chọn thư mục lưu trước nhé!");
    try {
        let idx = parseInt(localStorage.getItem('last_idx') || '0') + 1;
        const h = await directoryHandle.getFileHandle(`hoso_luatsu_${idx}.md`, {create:true});
        const w = await h.createWritable(); 
        await w.write(document.getElementById('note-area').value); 
        await w.close();
        localStorage.setItem('last_idx', idx); 
        alert("Đã lưu hồ sơ thành công!");
    } catch(e) { 
        alert("Lỗi khi lưu file: " + e.message); 
    }
}

async function loadFileForAI() {
    try {
        const hs = await window.showOpenFilePicker({multiple:true});
        let c = "Nội dung hồ sơ:\n\n";
        for(const h of hs) { 
            const f = await h.getFile(); 
            c += `--- ${f.name} ---\n${await f.text()}\n\n`; 
        }
        navigator.clipboard.writeText(c); 
        alert("Đã nạp hồ sơ! Hãy dán vào Chat AI.");
    } catch(e){}
}

// Auto-save logic
const noteArea = document.getElementById('note-area');
if (noteArea) {
    noteArea.oninput = (e) => localStorage.setItem('wife_ai_knowledge', e.target.value);
}

function openChat(url) { 
    window.open(url, '_blank', 'width=1100,height=850'); 
}

// Clock Logic
function startClock() {
    const eyelidL = document.querySelector('.eyelid-left');
    const eyelidR = document.querySelector('.eyelid-right');
    const needle = { 
        sec: document.getElementById('sec'), 
        min: document.getElementById('min'), 
        hour: document.getElementById('hour') 
    };
    
    if (!needle.sec) return;

    function update() {
        const now = new Date();
        const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
        needle.sec.style.transform = `rotate(${s*6}deg)`; 
        needle.min.style.transform = `rotate(${m*6}deg)`; 
        needle.hour.style.transform = `rotate(${(h%12)*30 + m*0.5}deg)`;
        
        if(s % 5 === 0 && eyelidL) {
            eyelidL.classList.add('blink'); eyelidR.classList.add('blink');
            setTimeout(() => { eyelidL.classList.remove('blink'); eyelidR.classList.remove('blink'); }, 200);
        }
    }
    setInterval(update, 1000);
    update();
}
