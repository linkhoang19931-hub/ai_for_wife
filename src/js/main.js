// Lawyer Intelligence Hub Pro - "Stealth Radar 4.0" Engine
let todos = JSON.parse(localStorage.getItem('wife_todos') || '[]');
let directoryHandle = null;
let lastLawData = JSON.parse(localStorage.getItem('cached_law_data') || 'null');

// --- INITIALIZATION ---
window.onload = () => {
    if (localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
    const noteArea = document.getElementById('note-area');
    if (noteArea) noteArea.value = localStorage.getItem('wife_ai_knowledge') || '';
    
    renderTodos(); 
    startClock(); 
    if (lastLawData) renderLawGrid(lastLawData, true);
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
    line.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(line);
}

// --- TAB SYSTEM ---
function switchTab(mode) {
    const tabs = ['edit', 'preview', 'law'];
    const noteArea = document.getElementById('note-area');

    tabs.forEach(t => {
        const area = document.getElementById(t + '-area');
        const btn = document.getElementById('tab-' + t);
        if (area) area.style.display = (t === mode) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === mode);
    });

    if (noteArea) noteArea.style.display = (mode === 'edit') ? 'block' : 'none';

    if (mode === 'law') {
        const lastFetch = localStorage.getItem('last_law_fetch') || 0;
        if (Date.now() - lastFetch > 600000) fetchLegalDocs(); // Quét lại nếu sau 10 phút
    }
    
    if (mode === 'preview') {
        const previewArea = document.getElementById('preview-area');
        if (typeof marked !== 'undefined' && previewArea && noteArea) {
            previewArea.innerHTML = marked.parse(noteArea.value || '');
        }
    }
}

// --- STEALTH DRAG SYSTEM ---
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;
    let isDragging = false, startX, startY, initialX = 0, initialY = 0;
    const saved = JSON.parse(localStorage.getItem('clock_pos_v4') || 'null');
    if (saved) { initialX = saved.x; initialY = saved.y; clock.style.transform = `translate3d(${initialX}px, ${initialY}px, 0)`; }

    clock.addEventListener("mousedown", (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        clock.style.transition = "none"; clock.style.zIndex = 10000;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const currentX = initialX + (e.clientX - startX);
        const currentY = initialY + (e.clientY - startY);
        clock.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        clock.dataset.tmpX = currentX; clock.dataset.tmpY = currentY;
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        initialX = parseFloat(clock.dataset.tmpX) || initialX;
        initialY = parseFloat(clock.dataset.tmpY) || initialY;
        clock.style.transition = "transform 0.2s ease-out";
        localStorage.setItem('clock_pos_v4', JSON.stringify({x: initialX, y: initialY}));
    });
}

// --- RADAR 4.0 (RSS-to-JSON Hybrid) ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    logDebug("⚡ Đang kích hoạt Radar 4.0 (Cổng chuyên dụng)...");

    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    const engines = [
        // Động cơ 1: RSS2JSON (IP Uy tín)
        (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}&v=${Date.now()}`,
        // Động cơ 2: AllOrigins Raw
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        // Động cơ 3: Codetabs Stealth
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    const fetchAny = async (name, url) => {
        for (let i = 0; i < engines.length; i++) {
            try {
                logDebug(`[${name}] Thử Động cơ ${i + 1}...`);
                const response = await fetch(engines[i](url));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                if (i === 0) { // Xử lý JSON từ RSS2JSON
                    const data = await response.json();
                    if (data.status !== 'ok') throw new Error("API bận");
                    logDebug(`[${name}] Đã lấy ${data.items.length} tin (JSON).`);
                    return data.items.slice(0, 8).map(it => ({ title: it.title, link: it.link, pubDate: it.pubDate }));
                } else { // Xử lý XML thô
                    const text = await response.text();
                    if (text.length < 500) throw new Error("Dữ liệu ngắn");
                    const xml = new DOMParser().parseFromString(text, "text/xml");
                    const items = Array.from(xml.querySelectorAll("item")).slice(0, 8).map(it => ({
                        title: it.querySelector("title")?.textContent,
                        link: it.querySelector("link")?.textContent,
                        pubDate: it.querySelector("pubDate")?.textContent
                    }));
                    if (items.length > 0) { logDebug(`[${name}] Đã lấy ${items.length} tin (XML).`); return items; }
                }
            } catch (e) { logDebug(`[${name}] Động cơ ${i + 1} nghẽn: ${e.message.slice(0, 15)}`, true); }
        }
        return [];
    };

    try {
        const [vb, dt, cv] = await Promise.all([
            fetchAny("Văn bản", feeds.vanban),
            fetchAny("Dự thảo", feeds.duthao),
            fetchAny("Công văn", feeds.congvan)
        ]);

        if (vb.length || dt.length || cv.length) {
            const freshData = { vanban: vb, duthao: dt, congvan: cv };
            renderLawGrid(freshData);
            localStorage.setItem('cached_law_data', JSON.stringify(freshData));
            localStorage.setItem('last_law_fetch', Date.now().toString());
            logDebug("✅ Radar: Kết nối thành công!");
        } else { throw new Error("Tất cả động cơ đều bị chặn."); }
    } catch (err) {
        logDebug(`⚠️ Lỗi: ${err.message}`, true);
        if (lastLawData) { logDebug("⚡ Đang hiển thị dữ liệu lưu tạm."); renderLawGrid(lastLawData, true); }
    }
}

function renderLawGrid(data, isCached = false) {
    const listEl = document.getElementById('law-list');
    const createCol = (title, items, color) => {
        const cards = items.map(item => `
            <div class="law-card" style="border-left: 3px solid ${color}" onclick="window.open('${item.link}', '_blank')">
                <span class="law-title">${item.title}</span>
                <div class="law-meta">📅 ${item.pubDate ? new Date(item.pubDate).toLocaleDateString('vi-VN') : 'Mới'}</div>
            </div>
        `).join('');
        return `<div class="law-column"><h3>${title}</h3>${cards || '<p style="font-size:0.7rem; color:gray; text-align:center; padding:10px;">Đang cập nhật...</p>'}</div>`;
    };

    listEl.innerHTML = `
        ${isCached ? '<div style="grid-column: span 3; background:#FEF3C7; color:#92400E; font-size:0.7rem; padding:4px; border-radius:4px; margin-bottom:10px; text-align:center;">🔔 Đang hiển thị dữ liệu Radar phiên trước (Dữ liệu Offline)</div>' : ''}
        <div class="law-grid" style="grid-column: span 3; width: 100%;">
            ${createCol("⚖️ Văn bản mới", data.vanban || [], "#4F46E5")}
            ${createCol("📝 Dự thảo mới", data.duthao || [], "#F59E0B")}
            ${createCol("✉️ Công văn mới", data.congvan || [], "#10B981")}
        </div>
    `;
}

// --- TODO SYSTEM ---
function renderTodos() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;
    listEl.innerHTML = todos.map((t, i) => `<div class="todo-item ${t.done ? 'done' : ''}"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${i})"><span>${t.text}</span></div><button class="btn-delete" onclick="deleteTodo(${i})">✕</button></div>`).join('');
    localStorage.setItem('wife_todos', JSON.stringify(todos));
}
function addTodo() { const text = prompt("Vụ việc mới:"); if(text) { todos.push({text, done:false}); renderTodos(); } }
function deleteTodo(i) { if(confirm("Xóa?")) { todos.splice(i, 1); renderTodos(); } }
function toggleTodo(i) { todos[i].done = !todos[i].done; renderTodos(); }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode')); }
function toggleFocusMode() { document.body.classList.toggle('focus-mode'); }
async function selectFolder() { try { directoryHandle = await window.showDirectoryPicker(); } catch(e){ alert("Cần quyền."); } }
async function saveAsNewFile() {
    if(!directoryHandle) return alert("Chọn thư mục!");
    try {
        let idx = parseInt(localStorage.getItem('last_idx') || '0') + 1;
        const h = await directoryHandle.getFileHandle(`hoso_luatsu_${idx}.md`, {create:true});
        const w = await h.createWritable(); await w.write(document.getElementById('note-area').value); await w.close();
        localStorage.setItem('last_idx', idx); alert("Lưu xong!");
    } catch(e) { alert("Lỗi: " + e.message); }
}
async function loadFileForAI() {
    try {
        const hs = await window.showOpenFilePicker({multiple:true});
        let c = "Nội dung:\n\n";
        for(const h of hs) { const f = await h.getFile(); c += `--- ${f.name} ---\n${await f.text()}\n\n`; }
        navigator.clipboard.writeText(c); alert("Đã nạp clipboard!");
    } catch(e){}
}
document.addEventListener('input', (e) => { if (e.target.id === 'note-area') localStorage.setItem('wife_ai_knowledge', e.target.value); });
function openChat(url) { window.open(url, '_blank', 'width=1100,height=850'); }
function startClock() {
    const eyelidL = document.querySelector('.eyelid-left'), eyelidR = document.querySelector('.eyelid-right');
    const needle = { sec: document.getElementById('sec'), min: document.getElementById('min'), hour: document.getElementById('hour') };
    if (!needle.sec) return;
    function update() {
        const now = new Date();
        const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
        needle.sec.style.transform = `rotate(${s*6}deg)`; needle.min.style.transform = `rotate(${m*6}deg)`; needle.hour.style.transform = `rotate(${(h%12)*30 + m*0.5}deg)`;
        if(s % 5 === 0 && eyelidL) { eyelidL.classList.add('blink'); eyelidR.classList.add('blink'); setTimeout(() => { eyelidL.classList.remove('blink'); eyelidR.classList.remove('blink'); }, 200); }
    }
    setInterval(update, 1000); update();
}
