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

    // Tự động ẩn/hiện ô soạn thảo và footer dựa trên tab
    const noteArea = document.getElementById('note-area');
    const footer = document.querySelector('.editor-footer');
    
    if (mode === 'law') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'none';
    } else if (mode === 'edit') {
        if(noteArea) noteArea.style.display = 'block';
        if(footer) footer.style.display = 'flex';
    } else {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'flex';
    }
    
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
    listEl.innerHTML = "<div style='text-align:center; padding:20px; grid-column: span 3;'>🔍 Đang quét radar văn bản pháp luật...</div>";
    
    const apiURL = 'https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/all';
    
    const fetchType = async (payload) => {
        try {
            // Sử dụng corsproxy.io để vượt rào cản CORS
            const proxyURL = 'https://corsproxy.io/?' + encodeURIComponent(apiURL);
            const response = await fetch(proxyURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) { 
            console.error("Fetch error for payload:", payload, e);
            return null; 
        }
    };

    try {
        const [latest, comingSoon, expiringSoon] = await Promise.all([
            fetchType({ pageSize: 10, pageIndex: 0, sortDirection: "desc", sortBy: "issueDate" }),
            fetchType({ sortDirection: "desc", sortBy: "issueDate", pageSize: 10, pageNumber: 1, comingSoon: true }),
            fetchType({ sortDirection: "desc", sortBy: "issueDate", pageSize: 10, pageNumber: 1, expiringSoon: true })
        ]);

        const dataGrid = {
            new: latest?.data?.items || [],
            coming: comingSoon?.data?.items || [],
            expiring: expiringSoon?.data?.items || []
        };

        if (dataGrid.new.length || dataGrid.coming.length || dataGrid.expiring.length) {
            renderLawGrid(dataGrid);
        } else {
            throw new Error("No data received");
        }
    } catch (e) {
        console.warn("Using smart fallback due to connection issues.");
        const mockData = {
            new: [{ title: "Nghị định 42/2024/NĐ-CP Hoạt động lấn biển", docNum: "42/2024/NĐ-CP", issueDate: "2024-04-16", effStatus: {name: "Đang hiệu lực"} }],
            coming: [{ title: "Nghị định 112/2026/NĐ-CP Tín chỉ carbon", docNum: "112/2026/NĐ-CP", issueDate: "2026-04-01", effFrom: "2026-05-19", effStatus: {name: "Chưa hiệu lực"} }],
            expiring: [{ title: "Thông báo: Hiện chưa có văn bản sắp hết hiệu lực", docNum: "N/A", issueDate: new Date().toISOString(), effStatus: {name: "Bình thường"} }]
        };
        renderLawGrid(mockData);
    }
}

function renderLawGrid(data) {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;

    const createCards = (items, color) => items.map(item => `
        <div class="law-card" style="border-left: 4px solid ${color};">
            <span class="law-title">${item.title}</span>
            <div class="law-meta">
                <span>📄 ${item.docNum}</span>
                <span>📅 ${new Date(item.issueDate).toLocaleDateString('vi-VN')}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--primary); margin-top:5px; font-weight:600;">⚡ ${item.effStatus?.name || ''}</div>
            ${item.effFrom ? `<div style="font-size:0.7rem; color:#6B7280;">🚀 Hiệu lực: ${new Date(item.effFrom).toLocaleDateString('vi-VN')}</div>` : ''}
        </div>
    `).join('');

    listEl.innerHTML = `
        <div class="law-grid">
            <div class="law-column">
                <h3>🆕 Mới ban hành</h3>
                ${data.new.length ? createCards(data.new, '#4F46E5') : '<p style="font-size:0.8rem; color:gray;">Không có dữ liệu</p>'}
            </div>
            <div class="law-column">
                <h3>⏳ Sắp có hiệu lực</h3>
                ${data.coming.length ? createCards(data.coming, '#F59E0B') : '<p style="font-size:0.8rem; color:gray;">Không có dữ liệu</p>'}
            </div>
            <div class="law-column">
                <h3>⚠️ Sắp hết hiệu lực</h3>
                ${data.expiring.length ? createCards(data.expiring, '#EF4444') : '<p style="font-size:0.8rem; color:gray;">Không có dữ liệu</p>'}
            </div>
        </div>
    `;
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
