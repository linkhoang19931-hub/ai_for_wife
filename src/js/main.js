// Lawyer Intelligence Hub Pro - Main Logic
let todos = JSON.parse(localStorage.getItem('wife_todos') || '[]');
let directoryHandle = null;

// --- INITIALIZATION ---
window.onload = () => {
    if (localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
    const noteArea = document.getElementById('note-area');
    if (noteArea) noteArea.value = localStorage.getItem('wife_ai_knowledge') || '';
    
    renderTodos(); 
    startClock(); 
    fetchLegalDocs();
    initDraggableClock(); 
};

function logDebug(msg, isError = false) {
    const logEl = document.getElementById('debug-log');
    if (!logEl) return;
    const line = document.createElement('div');
    line.style.color = isError ? '#ff4d4d' : '#0f0';
    line.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(line);
}

// --- TAB SYSTEM ---
function switchTab(mode) {
    const tabs = ['edit', 'preview', 'law'];
    tabs.forEach(t => {
        const area = document.getElementById(t + '-area');
        const btn = document.getElementById('tab-' + t);
        if (area) area.style.display = (t === mode) ? 'flex' : 'none';
        if (btn) btn.classList.toggle('active', t === mode);
    });

    const noteArea = document.getElementById('note-area');
    const footer = document.querySelector('.editor-footer');
    
    if (mode === 'law') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'none';
    } else if (mode === 'preview') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'flex';
        const previewArea = document.getElementById('preview-area');
        if (typeof marked !== 'undefined' && previewArea) {
            previewArea.innerHTML = marked.parse(noteArea.value || '');
        }
    } else {
        if(noteArea) noteArea.style.display = 'block';
        if(footer) footer.style.display = 'flex';
    }
}

// --- ULTRA SMOOTH DRAG SYSTEM ---
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;

    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    // Load saved position
    const saved = JSON.parse(localStorage.getItem('clock_pos_v2') || 'null');
    if (saved) {
        xOffset = saved.x;
        yOffset = saved.y;
        setTranslate(xOffset, yOffset, clock);
    }

    clock.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === clock || clock.contains(e.target)) {
            isDragging = true;
            clock.style.transition = "none";
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, clock);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    function dragEnd() {
        isDragging = false;
        clock.style.transition = "transform 0.2s ease-out";
        localStorage.setItem('clock_pos_v2', JSON.stringify({x: xOffset, y: yOffset}));
    }
}

// --- LEGAL RADAR (Direct MOJ API) ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='grid-column: span 3; text-align:center;'>🔍 Radar đang quét...</div>";
    
    const apiURL = 'https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/all';
    
    const fetchFromMOJ = async (payload) => {
        // Thử gọi trực tiếp trước, nếu fail mới dùng proxy
        try {
            const response = await fetch(apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) {
            logDebug("Direct fetch failed, trying proxy...", true);
            const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(apiURL)}&v=${Date.now()}`;
            const res = await fetch(proxy);
            const data = await res.json();
            // AllOrigins trả về string trong contents, cần parse lại
            return JSON.parse(data.contents);
        }
    };

    try {
        logDebug("Đang quét Radar Bộ Tư Pháp...");
        const [latest, coming, expiring] = await Promise.all([
            fetchFromMOJ({ pageSize: 8, pageIndex: 0, sortDirection: "desc", sortBy: "issueDate" }),
            fetchFromMOJ({ pageSize: 8, pageNumber: 1, comingSoon: true, sortDirection: "desc", sortBy: "issueDate" }),
            fetchFromMOJ({ pageSize: 8, pageNumber: 1, expiringSoon: true, sortDirection: "desc", sortBy: "issueDate" })
        ]);

        renderLawGrid({
            new: latest?.data?.items || [],
            coming: coming?.data?.items || [],
            expiring: expiring?.data?.items || []
        });
        logDebug("Radar quét thành công!");
    } catch (e) {
        logDebug(`Lỗi Radar: ${e.message}`, true);
        listEl.innerHTML = `<div style='grid-column: span 3; text-align:center; color:#ff4d4d;'>⚠️ Lỗi kết nối. Vui lòng thử lại hoặc mở <a href='https://vbpl.vn' target='_blank'>vbpl.vn</a></div>`;
    }
}

function renderLawGrid(data) {
    const listEl = document.getElementById('law-list');
    
    const createCol = (title, items, color) => {
        const cards = items.map(item => `
            <div class="law-card" style="border-left: 3px solid ${color}" onclick="window.open('https://vbpl.vn/search/Pages/chi-tiet-van-ban.aspx?ItemID=${item.id}', '_blank')">
                <span class="law-title">${item.title}</span>
                <div class="law-meta">📄 ${item.docNum || 'Đang cập nhật'}</div>
                <div class="law-meta">📅 ${item.issueDate ? new Date(item.issueDate).toLocaleDateString('vi-VN') : ''}</div>
            </div>
        `).join('');
        return `<div class="law-column"><h3>${title}</h3>${cards || '<p style="font-size:0.7rem; color:gray;">Trống</p>'}</div>`;
    };

    listEl.innerHTML = `
        <div class="law-grid" style="grid-column: span 3; width: 100%;">
            ${createCol("🆕 Mới ban hành", data.new, "#4F46E5")}
            ${createCol("⏳ Sắp hiệu lực", data.coming, "#F59E0B")}
            ${createCol("⚠️ Sắp hết hạn", data.expiring, "#EF4444")}
        </div>
    `;
}

// --- TODO SYSTEM ---
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
    if(text) { todos.push({text, done:false}); renderTodos(); } 
}

function deleteTodo(i) { 
    if(confirm("Xóa việc này?")) { todos.splice(i, 1); renderTodos(); } 
}

function toggleTodo(i) { 
    todos[i].done = !todos[i].done; 
    renderTodos(); 
}

// --- UI CONTROLS ---
function toggleDarkMode() { 
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode')); 
}

function toggleFocusMode() { document.body.classList.toggle('focus-mode'); }

async function selectFolder() { 
    try { directoryHandle = await window.showDirectoryPicker(); } catch(e){ alert("Trình duyệt cần quyền truy cập."); } 
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
        alert("Lưu hồ sơ thành công!");
    } catch(e) { alert("Lỗi: " + e.message); }
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

document.addEventListener('input', (e) => {
    if (e.target.id === 'note-area') localStorage.setItem('wife_ai_knowledge', e.target.value);
});

function openChat(url) { window.open(url, '_blank', 'width=1100,height=850'); }

function startClock() {
    const eyelidL = document.querySelector('.eyelid-left');
    const eyelidR = document.querySelector('.eyelid-right');
    const needle = { sec: document.getElementById('sec'), min: document.getElementById('min'), hour: document.getElementById('hour') };
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
