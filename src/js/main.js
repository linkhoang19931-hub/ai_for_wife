// Lawyer Intelligence Hub Pro - "Stealth Radar 5.1" & "Precision Time Tracker"
let todos = JSON.parse(localStorage.getItem('wife_todos_v2') || '[]');
let directoryHandle = null;
let lastLawData = JSON.parse(localStorage.getItem('cached_law_data') || 'null');
let timerInterval = null;

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

    // Khởi động vòng lặp cập nhật timer cho các task đang chạy
    timerInterval = setInterval(updateAllTimers, 1000);
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
    const footer = document.querySelector('.editor-footer');

    tabs.forEach(t => {
        const area = document.getElementById(t + '-area');
        const btn = document.getElementById('tab-' + t);
        if (area) area.style.display = (t === mode) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === mode);
    });

    if (noteArea) noteArea.style.display = (mode === 'edit') ? 'block' : 'none';
    if (footer) footer.style.display = (mode === 'law') ? 'none' : 'flex';

    if (mode === 'law') fetchLegalDocs();
    if (mode === 'preview' && typeof marked !== 'undefined') {
        document.getElementById('preview-area').innerHTML = marked.parse(noteArea.value || '');
    }
}

// --- PRECISION DRAG SYSTEM ---
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

// --- RADAR 5.1 (Refined Legal Satellite) ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    logDebug("📡 Radar 5.1: Đang lọc nhiễu văn bản chính thống...");

    const currentYear = new Date().getFullYear();
    const queries = {
        vanban: `site:thuvienphapluat.vn/van-ban/ "Nghị định" OR "Thông tư" OR "Luật" OR "Quyết định" ${currentYear}`,
        duthao: `site:thuvienphapluat.vn/van-ban/ "Dự thảo" ${currentYear}`,
        congvan: `site:thuvienphapluat.vn/van-ban/ "Công văn" ${currentYear}`
    };

    const fetchSatellite = async (name, query) => {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
        const proxies = [
            `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
        ];

        for (const proxy of proxies) {
            try {
                logDebug(`[${name}] Đang quét vệ tinh qua cổng ${new URL(proxy).hostname}...`);
                const response = await fetch(proxy);
                
                if (proxy.includes('rss2json')) {
                    const data = await response.json();
                    if (data.status === 'ok') return processItems(data.items, name);
                } else {
                    const data = await response.json();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                    const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => ({
                        title: item.querySelector("title").textContent,
                        link: item.querySelector("link").textContent,
                        pubDate: item.querySelector("pubDate").textContent
                    }));
                    if (items.length > 0) return processItems(items, name);
                }
            } catch (e) {
                logDebug(`[${name}] Cổng lỗi: ${e.message.slice(0, 20)}`, true);
            }
        }
        return [];
    };

    const processItems = (items, name) => {
        const filtered = items.filter(it => {
            const t = it.title.toLowerCase();
            return !t.includes("danh sách") && !t.includes("tổng hợp") && !t.includes("hướng dẫn") && !t.includes("bao nhiêu tiền") && !t.includes("lịch nghỉ");
        });
        logDebug(`[${name}] Đã lấy ${filtered.length} văn bản.`);
        return filtered.slice(0, 8).map(it => ({ title: it.title.split(' - ')[0], link: it.link, pubDate: it.pubDate }));
    };

    try {
        const [vb, dt, cv] = await Promise.all([ fetchSatellite("Văn bản", queries.vanban), fetchSatellite("Dự thảo", queries.duthao), fetchSatellite("Công văn", queries.congvan) ]);
        if (vb.length || dt.length || cv.length) {
            const freshData = { vanban: vb, duthao: dt, congvan: cv };
            renderLawGrid(freshData);
            localStorage.setItem('cached_law_data', JSON.stringify(freshData));
            logDebug("✅ Radar đã cập nhật dữ liệu mới nhất.");
        } else { throw new Error("Không có tín hiệu."); }
    } catch (err) {
        logDebug(`⚠️ Lỗi: ${err.message}`, true);
        if (lastLawData) renderLawGrid(lastLawData, true);
    }
}

function renderLawGrid(data, isCached = false) {
    const listEl = document.getElementById('law-list');
    const createCol = (title, items, color) => {
        const cards = items.map(item => {
            const docNumMatch = item.title.match(/[0-9\/]+[A-ZĐ-]+[0-9]*/);
            const docNum = docNumMatch ? docNumMatch[0] : "VB gốc";
            return `
                <div class="law-card" style="border-left: 3px solid ${color}" onclick="window.open('${item.link}', '_blank')">
                    <span class="law-title">${item.title}</span>
                    <div class="law-meta">📄 ${docNum} | 📅 ${item.pubDate ? new Date(item.pubDate).toLocaleDateString('vi-VN') : 'Mới'}</div>
                </div>
            `;
        }).join('');
        return `<div class="law-column"><h3>${title}</h3>${cards || '<p style="font-size:0.7rem; color:gray; text-align:center;">Trống</p>'}</div>`;
    };
    listEl.innerHTML = `
        ${isCached ? '<div style="grid-column: span 3; background:#FEF3C7; color:#92400E; font-size:0.7rem; padding:4px; border-radius:4px; margin-bottom:10px; text-align:center;">🔔 Dữ liệu Radar Offline</div>' : ''}
        <div class="law-grid" style="grid-column: span 3; width: 100%;">${createCol("⚖️ Văn bản mới", data.vanban || [], "#4F46E5")}${createCol("📝 Dự thảo mới", data.duthao || [], "#F59E0B")}${createCol("✉️ Công văn mới", data.congvan || [], "#10B981")}</div>
    `;
}

// --- PRECISION TIME TRACKER SYSTEM ---
function formatVNTime(date) {
    if (!date) return "--:--";
    return new Date(date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });
}

function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const days = (h / 24).toFixed(1);
    const hours = h.toString().padStart(2, '0');
    const mins = m.toString().padStart(2, '0');
    const secs = s.toString().padStart(2, '0');
    
    return `${hours}:${mins}:${secs} <span style="font-size:0.6rem; font-weight:normal; opacity:0.7;">(${days} ngày)</span>`;
}

function renderTodos() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    listEl.innerHTML = todos.map((t, i) => {
        let statusTag = `<span class="status-tag">${t.status.toUpperCase()}</span>`;
        if (t.status === 'running') statusTag = `<span class="status-tag running">ĐANG CHẠY</span>`;
        if (t.status === 'paused') statusTag = `<span class="status-tag paused">TẠM DỪNG</span>`;

        let timeDetails = "";
        if (t.startTime) {
            timeDetails = `<div class="task-meta">🛫 Bắt đầu: ${formatVNTime(t.startTime)}</div>`;
        }
        if (t.endTime) {
            timeDetails += `<div class="task-meta">🏁 Kết thúc: ${formatVNTime(t.endTime)}</div>`;
        }

        const currentTotalMs = calculateTotalTime(t);
        
        return `
            <div class="todo-item ${t.status === 'completed' ? 'done' : ''}">
                <div class="todo-main">
                    <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                        <span style="font-size:0.85rem; font-weight:600;">${t.text} ${statusTag}</span>
                        <div class="task-timer" id="timer-${i}">${formatDuration(currentTotalMs)}</div>
                        ${timeDetails}
                    </div>
                    <button class="btn-delete" onclick="deleteTodo(${i})">✕</button>
                </div>
                <div class="todo-controls">
                    ${t.status !== 'completed' ? `
                        ${t.status !== 'running' ? 
                            `<button class="btn-time" onclick="startTask(${i})">▶️ Bắt đầu</button>` : 
                            `<button class="btn-time active" onclick="pauseTask(${i})">⏸️ Tạm dừng</button>`
                        }
                        <button class="btn-time" onclick="endTask(${i})">⏹️ Kết thúc</button>
                    ` : `<span style="font-size:0.7rem; color:var(--primary);">✅ Đã hoàn thành</span>`}
                </div>
            </div>
        `;
    }).join('');
    localStorage.setItem('wife_todos_v2', JSON.stringify(todos));
}

function calculateTotalTime(task) {
    let total = task.totalTime || 0;
    if (task.status === 'running' && task.lastStartedTime) {
        total += (Date.now() - task.lastStartedTime);
    }
    return total;
}

function updateAllTimers() {
    todos.forEach((t, i) => {
        if (t.status === 'running') {
            const timerEl = document.getElementById(`timer-${i}`);
            if (timerEl) timerEl.innerHTML = formatDuration(calculateTotalTime(t));
        }
    });
}

function addTodo() { 
    const text = prompt("Nội dung công việc:"); 
    if(text) { 
        todos.push({
            text, 
            status: 'pending', 
            startTime: null, 
            endTime: null, 
            lastStartedTime: null,
            totalTime: 0 
        }); 
        renderTodos(); 
    } 
}

function startTask(i) {
    // Tự động pause các task khác nếu đang chạy (vợ yêu cầu có thể sang task khác)
    // todos.forEach((t, idx) => { if (t.status === 'running' && idx !== i) pauseTask(idx); });
    
    const t = todos[i];
    if (!t.startTime) t.startTime = Date.now();
    t.lastStartedTime = Date.now();
    t.status = 'running';
    renderTodos();
}

function pauseTask(i) {
    const t = todos[i];
    if (t.status === 'running') {
        t.totalTime += (Date.now() - t.lastStartedTime);
        t.lastStartedTime = null;
        t.status = 'paused';
    }
    renderTodos();
}

function endTask(i) {
    const t = todos[i];
    if (t.status === 'running') {
        t.totalTime += (Date.now() - t.lastStartedTime);
    }
    t.endTime = Date.now();
    t.lastStartedTime = null;
    t.status = 'completed';
    renderTodos();
}

function deleteTodo(i) { if(confirm("Xóa task này?")) { todos.splice(i, 1); renderTodos(); } }

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
