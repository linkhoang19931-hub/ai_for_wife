// Lawyer Intelligence Hub Pro - "Stealth Radar" Engine
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

    if (mode === 'law') fetchLegalDocs();
    if (mode === 'preview') {
        const previewArea = document.getElementById('preview-area');
        const noteArea = document.getElementById('note-area');
        if (typeof marked !== 'undefined' && previewArea) {
            previewArea.innerHTML = marked.parse(noteArea.value || '');
        }
    }
}

// --- STEALTH DRAG SYSTEM (Photoshop Style) ---
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;

    let isDragging = false;
    let startX, startY;
    let initialTranslateX = 0, initialTranslateY = 0;

    // Load saved position
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
        
        // Cập nhật giá trị tạm thời để khi nhả chuột ko bị giật
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

// --- MULTI-PROXY RADAR (Hacker Edition) ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='grid-column: span 3; text-align:center; padding:20px;'>📡 Đang quét Radar Stealth (Thử nghiệm đa tầng)...</div>";
    
    logDebug("Khởi động Radar đa tầng...");

    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    // Danh sách Proxy "Ngầm" để lách luật
    const proxies = [
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u) => `https://thingproxy.freeboard.io/fetch/${u}`
    ];

    const stealthFetch = async (name, url) => {
        for (let i = 0; i < proxies.length; i++) {
            try {
                logDebug(`[${name}] Đang thử Động cơ ${i + 1}...`);
                const response = await fetch(proxies[i](url), { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const text = await response.text();
                if (text.length < 500) throw new Error("Dữ liệu không đủ độ dài.");

                const parser = new DOMParser();
                const xml = parser.parseFromString(text, "text/xml");
                if (xml.querySelector("parsererror")) throw new Error("XML Corrupted.");

                const items = Array.from(xml.querySelectorAll("item")).slice(0, 8).map(item => ({
                    title: item.querySelector("title")?.textContent || "Văn bản",
                    link: item.querySelector("link")?.textContent || "#",
                    pubDate: item.querySelector("pubDate")?.textContent || ""
                }));

                logDebug(`[${name}] Đã lấy được ${items.length} tin.`);
                return items;
            } catch (e) {
                logDebug(`[${name}] Động cơ ${i + 1} kẹt: ${e.message.slice(0, 20)}...`, true);
            }
        }
        return [];
    };

    try {
        // Chạy song song nhưng xử lý từng luồng
        const [vb, dt, cv] = await Promise.all([
            stealthFetch("Văn bản", feeds.vanban),
            stealthFetch("Dự thảo", feeds.duthao),
            stealthFetch("Công văn", feeds.congvan)
        ]);

        if (!vb.length && !dt.length && !cv.length) throw new Error("Tất cả vệ tinh bị chặn.");

        renderLawGrid({ vanban: vb, duthao: dt, congvan: cv });
        logDebug("Radar quét hoàn tất!");
    } catch (err) {
        logDebug(`THẤT BẠI: ${err.message}`, true);
        listEl.innerHTML = `
            <div style='grid-column: span 3; text-align:center; padding:20px;'>
                <p style='color:#ff4d4d;'>⚠️ Không thể quét radar tự động (CORS Security).</p>
                <button class="btn-primary" onclick="window.open('https://thuvienphapluat.vn/tra-cuu-phap-luat-moi.aspx', '_blank')" style="margin-top:10px;">Mở Thư Viện Pháp Luật chính thống ↗️</button>
            </div>
        `;
    }
}

function renderLawGrid(data) {
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
        <div class="law-grid" style="grid-column: span 3; width: 100%;">
            ${createCol("⚖️ Văn bản mới", data.vanban, "#4F46E5")}
            ${createCol("📝 Dự thảo mới", data.duthao, "#F59E0B")}
            ${createCol("✉️ Công văn mới", data.congvan, "#10B981")}
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
