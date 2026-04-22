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
    logEl.style.display = 'block';
    const line = document.createElement('div');
    line.style.color = isError ? '#ff4d4d' : '#0f0';
    line.style.fontSize = '0.7rem';
    line.style.marginBottom = '2px';
    line.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(line);
}

// --- TAB SYSTEM ---
function switchTab(mode) {
    const tabs = ['edit', 'preview', 'law'];
    tabs.forEach(t => {
        const area = document.getElementById(t + '-area');
        const btn = document.getElementById('tab-' + t);
        if (area) area.style.display = (t === mode) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === mode);
    });

    const noteArea = document.getElementById('note-area');
    const previewArea = document.getElementById('preview-area');
    const footer = document.querySelector('.editor-footer');
    
    if (mode === 'law') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'none';
        fetchLegalDocs(); // Tự động làm mới khi vào tab
    } else if (mode === 'preview') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'flex';
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

    const saved = JSON.parse(localStorage.getItem('clock_pos_v3') || 'null');
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
        localStorage.setItem('clock_pos_v3', JSON.stringify({x: xOffset, y: yOffset}));
    }
}

// --- MULTI-SOURCE LEGAL RADAR ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='grid-column: span 3; text-align:center; padding:20px;'>🔍 Radar đang quét đa tầng...</div>";
    
    logDebug("Khởi động Radar đa nguồn...");

    // Phương án 1: Gọi trực tiếp API Bộ Tư Pháp (Dành cho máy đã cài Allow CORS extension)
    const fetchDirect = async (payload) => {
        const url = 'https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/all';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    };

    // Phương án 2: Gọi qua Proxy AllOrigins
    const fetchProxy = async (payload) => {
        const target = 'https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/all';
        // AllOrigins POST proxy qua tham số url
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}&v=${Date.now()}`;
        const res = await fetch(proxy);
        const data = await res.json();
        return JSON.parse(data.contents); 
    };

    try {
        logDebug("Thử kết nối trực tiếp Bộ Tư Pháp...");
        let results;
        try {
            results = await Promise.all([
                fetchDirect({ pageSize: 6, pageIndex: 0, sortDirection: "desc", sortBy: "issueDate" }),
                fetchDirect({ pageSize: 6, pageNumber: 1, comingSoon: true, sortDirection: "desc", sortBy: "issueDate" }),
                fetchDirect({ pageSize: 6, pageNumber: 1, expiringSoon: true, sortDirection: "desc", sortBy: "issueDate" })
            ]);
            logDebug("Kết nối trực tiếp thành công!");
        } catch (e) {
            logDebug("Trực tiếp thất bại, thử qua Proxy...", true);
            results = await Promise.all([
                fetchProxy({ pageSize: 6, pageIndex: 0, sortDirection: "desc", sortBy: "issueDate" }),
                fetchProxy({ pageSize: 6, pageNumber: 1, comingSoon: true, sortDirection: "desc", sortBy: "issueDate" }),
                fetchProxy({ pageSize: 6, pageNumber: 1, expiringSoon: true, sortDirection: "desc", sortBy: "issueDate" })
            ]);
            logDebug("Proxy phản hồi thành công!");
        }

        renderLawGrid({
            new: results[0]?.data?.items || [],
            coming: results[1]?.data?.items || [],
            expiring: results[2]?.data?.items || []
        });

    } catch (err) {
        logDebug(`Radar lỗi: ${err.message}`, true);
        listEl.innerHTML = `
            <div style='grid-column: span 3; text-align:center; padding:20px;'>
                <p style='color:#ff4d4d;'>⚠️ Radar bị nhiễu sóng (Lỗi CORS).</p>
                <div style='background:#1a1a1a; padding:10px; border-radius:8px; margin:10px auto; max-width:400px; font-size:0.75rem; color:#ccc; text-align:left;'>
                    💡 <b>Mẹo cho Luật sư:</b> Để radar chạy mượt nhất, Vợ nhờ chồng cài extension "Allow CORS" trên Chrome nhé!
                </div>
                <button class="btn-primary" onclick="window.open('https://vbpl.vn', '_blank')">Mở VBPL.vn chính thống ↗️</button>
            </div>
        `;
    }
}

function renderLawGrid(data) {
    const listEl = document.getElementById('law-list');
    const createCol = (title, items, color, emptyMsg) => {
        const cards = items.map(item => `
            <div class="law-card" style="border-left: 3px solid ${color}" onclick="window.open('https://vbpl.vn/search/Pages/chi-tiet-van-ban.aspx?ItemID=${item.id}', '_blank')">
                <span class="law-title">${item.title}</span>
                <div class="law-meta">📄 ${item.docNum || 'Đang cập nhật'}</div>
                <div class="law-meta">📅 ${item.issueDate ? new Date(item.issueDate).toLocaleDateString('vi-VN') : ''}</div>
            </div>
        `).join('');
        return `<div class="law-column"><h3>${title}</h3>${cards || `<p style="font-size:0.7rem; color:gray; text-align:center; padding:10px;">${emptyMsg}</p>`}</div>`;
    };

    listEl.innerHTML = `
        <div class="law-grid" style="grid-column: span 3; width: 100%;">
            ${createCol("🆕 Mới ban hành", data.new, "#4F46E5", "Chưa có văn bản mới")}
            ${createCol("⏳ Sắp hiệu lực", data.coming, "#F59E0B", "Không có văn bản sắp hiệu lực")}
            ${createCol("⚠️ Sắp hết hạn", data.expiring, "#EF4444", "Mọi thứ vẫn ổn định")}
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
