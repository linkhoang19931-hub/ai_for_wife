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

// Legal Documents Logic
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "Đang tải dữ liệu từ VBPL...";
    try {
        // Fallback mock data for lawyer wife
        const mockItems = [
            { title: "Nghị định 112/2026/NĐ-CP Quản lý trao đổi tín chỉ carbon", docNum: "112/2026/NĐ-CP", issueDate: "2026-04-10", effFrom: "2026-06-01", isNew: true, effStatus: {name: "Sắp hiệu lực"} },
            { title: "Thông tư 05/2026/TT-BTP Hướng dẫn luật Luật sư sửa đổi", docNum: "05/2026/TT-BTP", issueDate: "2026-04-05", effFrom: "2026-05-15", isNew: true, effStatus: {name: "Chưa hiệu lực"} },
            { title: "Nghị quyết 24/2026/NQ-HĐND về phí lệ phí tại TP.HCM", docNum: "24/NQ-HĐND", issueDate: "2026-03-28", effFrom: "2026-04-01", isNew: false, effStatus: {name: "Đang có hiệu lực"} }
        ];
        renderLawList(mockItems);
    } catch (e) {
        listEl.innerHTML = "Không thể tải dữ liệu pháp luật.";
    }
}

function renderLawList(items) {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = items.map(item => `
        <div class="law-card">
            ${item.isNew ? '<span class="law-tag tag-new">Mới</span>' : ''}
            <span class="law-title">${item.title}</span>
            <div class="law-meta"><span>📄 ${item.docNum}</span><span>📅 Ban hành: ${new Date(item.issueDate).toLocaleDateString('vi-VN')}</span><span style="color:var(--primary)">⚡ ${item.effStatus.name}</span></div>
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
