// Lawyer Intelligence Hub Pro - "Stealth Radar 3.0" Engine
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
    if (lastLawData) renderLawGrid(lastLawData, true); // Hiện dữ liệu cũ trước cho nhanh
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

    // Tự động ẩn textarea soạn thảo khi sang tab khác
    if (noteArea) {
        noteArea.style.display = (mode === 'edit') ? 'block' : 'none';
    }

    if (mode === 'law') {
        // Chỉ quét nếu chưa có dữ liệu hoặc dữ liệu quá cũ (1 tiếng)
        const lastFetch = localStorage.getItem('last_law_fetch') || 0;
        if (Date.now() - lastFetch > 3600000 || !lastLawData) {
            fetchLegalDocs();
        }
    }
    
    if (mode === 'preview') {
        const previewArea = document.getElementById('preview-area');
        if (typeof marked !== 'undefined' && previewArea && noteArea) {
            previewArea.innerHTML = marked.parse(noteArea.value || '');
        }
    }
}

// --- DRAG & DROP SYSTEM (Photoshop Style) ---
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;

    let isDragging = false;
    let startX, startY;
    let initialTranslateX = 0, initialTranslateY = 0;

    const saved = JSON.parse(localStorage.getItem('clock_pos_v4') || 'null');
    if (saved) {
        initialTranslateX = saved.x;
        initialTranslateY = saved.y;
        clock.style.transform = `translate3d(${initialTranslateX}px, ${initialTranslateY}px, 0)`;
    }

    clock.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        clock.style.transition = "none";
        clock.style.zIndex = 10000;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const currentX = initialTranslateX + deltaX;
        const currentY = initialTranslateY + deltaY;
        clock.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        clock.dataset.lastX = currentX;
        clock.dataset.lastY = currentY;
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        initialTranslateX = parseFloat(clock.dataset.lastX) || initialTranslateX;
        initialTranslateY = parseFloat(clock.dataset.lastY) || initialTranslateY;
        clock.style.transition = "transform 0.2s ease-out";
        localStorage.setItem('clock_pos_v4', JSON.stringify({x: initialTranslateX, y: initialTranslateY}));
    });
}

// --- STEALTH RADAR 3.0 (Proxy Roulette + Local Cache) ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    
    logDebug("Khởi động Radar 3.0 (Deep Scan)...");

    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    const proxies = [
        (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&v=${Date.now()}`,
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
    ];

    const stealthFetch = async (name, url) => {
        for (let i = 0; i < proxies.length; i++) {
            try {
                logDebug(`[${name}] Động cơ ${i + 1} đang quét...`);
                const response = await fetch(proxies[i](url));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                let text;
                if (i === 0) { // AllOrigins JSON wrapper
                    const data = await response.json();
                    text = data.contents;
                } else {
                    text = await response.text();
                }

                if (!text || text.length < 500) throw new Error("Dữ liệu rác hoặc bị chặn.");

                const parser = new DOMParser();
                const xml = parser.parseFromString(text, "text/xml");
                const items = Array.from(xml.querySelectorAll("item")).slice(0, 8).map(item => ({
                    title: item.querySelector("title")?.textContent || "Văn bản",
                    link: item.querySelector("link")?.textContent || "#",
                    pubDate: item.querySelector("pubDate")?.textContent || ""
                }));

                if (items.length > 0) {
                    logDebug(`[${name}] Đã bắt được ${items.length} mục.`, false);
                    return items;
                }
            } catch (e) {
                logDebug(`[${name}] Động cơ ${i + 1} lỗi: ${e.message.slice(0, 15)}`, true);
            }
        }
        return [];
    };

    try {
        const [vb, dt, cv] = await Promise.all([
            stealthFetch("Văn bản", feeds.vanban),
            stealthFetch("Dự thảo", feeds.duthao),
            stealthFetch("Công văn", feeds.congvan)
        ]);

        if (vb.length || dt.length || cv.length) {
            const freshData = { vanban: vb, duthao: dt, congvan: cv };
            renderLawGrid(freshData);
            // Lưu vào bộ nhớ đệm
            localStorage.setItem('cached_law_data', JSON.stringify(freshData));
            localStorage.setItem('last_law_fetch', Date.now().toString());
            logDebug("Radar: Đã cập nhật dữ liệu mới nhất!");
        } else {
            throw new Error("Tất cả vệ tinh đều bị chặn.");
        }
    } catch (err) {
        logDebug(`Cảnh báo: ${err.message}`, true);
        if (lastLawData) {
            logDebug("Đang hiển thị dữ liệu từ bộ nhớ đệm...");
            renderLawGrid(lastLawData, true);
        } else {
            listEl.innerHTML = `<div style='grid-column: span 3; text-align:center; padding:20px; color:#ff4d4d;'>⚠️ Không thể kết nối. Vợ nhấn nút "Quét lại" hoặc mở trang gốc nhé!</div>`;
        }
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
        return `<div class="law-column"><h3>${title}</h3>${cards || '<p style="font-size:0.7rem; color:gray; text-align:center; padding:10px;">Trống</p>'}</div>`;
    };

    listEl.innerHTML = `
        ${isCached ? '<div style="grid-column: span 3; background:#FEF3C7; color:#92400E; font-size:0.7rem; padding:4px 10px; border-radius:4px; margin-bottom:10px; text-align:center;">🕒 Đang hiển thị dữ liệu lưu tạm (Radar đang bị nhiễu)</div>' : ''}
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

function deleteTodo(i) { if(confirm("Xóa?")) { todos.splice(i, 1); renderTodos(); } }
function toggleTodo(i) { todos[i].done = !todos[i].done; renderTodos(); }

function toggleDarkMode() { 
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode')); 
}

function toggleFocusMode() { document.body.classList.toggle('focus-mode'); }

async function selectFolder() { try { directoryHandle = await window.showDirectoryPicker(); } catch(e){ alert("Cần quyền."); } }

async function saveAsNewFile() {
    if(!directoryHandle) return alert("Chọn thư mục lưu!");
    try {
        let idx = parseInt(localStorage.getItem('last_idx') || '0') + 1;
        const h = await directoryHandle.getFileHandle(`hoso_luatsu_${idx}.md`, {create:true});
        const w = await h.createWritable(); await w.write(document.getElementById('note-area').value); await w.close();
        localStorage.setItem('last_idx', idx); alert("Lưu thành công!");
    } catch(e) { alert("Lỗi: " + e.message); }
}

async function loadFileForAI() {
    try {
        const hs = await window.showOpenFilePicker({multiple:true});
        let c = "Nội dung hồ sơ:\n\n";
        for(const h of hs) { const f = await h.getFile(); c += `--- ${f.name} ---\n${await f.text()}\n\n`; }
        navigator.clipboard.writeText(c); alert("Đã nạp vào clipboard!");
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
    setInterval(update, 1000); update();
}
