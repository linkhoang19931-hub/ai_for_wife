// Main Application Logic
let todos = JSON.parse(localStorage.getItem('wife_todos') || '[]');
let directoryHandle = null;

// Initialize on Load
window.onload = () => {
    if (localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
    const noteArea = document.getElementById('note-area');
    if (noteArea) noteArea.value = localStorage.getItem('wife_ai_knowledge') || '';
    
    renderTodos(); 
    startClock(); 
    fetchLegalDocs();
    initDraggableClock(); 
};

// --- DEBUG SYSTEM ---
function logDebug(msg, isError = false) {
    const logEl = document.getElementById('debug-log');
    if (!logEl) return;
    logEl.classList.add('active');
    const line = document.createElement('div');
    line.className = `debug-line ${isError ? 'debug-err' : ''}`;
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

// --- DRAG & DROP SYSTEM (Super Smooth) ---
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;

    let active = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    // Lấy vị trí đã lưu nếu có
    const savedPos = JSON.parse(localStorage.getItem('clock_pos') || 'null');
    if (savedPos) {
        xOffset = savedPos.x;
        yOffset = savedPos.y;
        setTranslate(xOffset, yOffset, clock);
    }

    clock.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === clock || clock.contains(e.target)) {
            active = true;
            clock.style.transition = "none";
        }
    }

    function drag(e) {
        if (active) {
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
        if (!active) return;
        initialX = currentX;
        initialY = currentY;
        active = false;
        clock.style.transition = "all 0.3s ease-out";
        localStorage.setItem('clock_pos', JSON.stringify({x: xOffset, y: yOffset}));
    }
}

// --- LEGAL RADAR SYSTEM ---
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='text-align:center; padding:40px; grid-column: span 3;'>🔍 Đang quét radar văn bản pháp luật...</div>";
    
    logDebug("Khởi động quét radar...");
    
    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    const fetchRSS = async (name, url) => {
        const proxies = [
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&v=${Date.now()}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
        ];

        for (let i = 0; i < proxies.length; i++) {
            try {
                logDebug(`Đang tải ${name} (Proxy ${i + 1})...`);
                const response = await fetch(proxies[i](url));
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const xmlText = await response.text();
                if (!xmlText || xmlText.length < 100) throw new Error("Dữ liệu quá ngắn hoặc rỗng");

                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, "text/xml");
                
                if (xml.querySelector("parsererror")) throw new Error("Lỗi định dạng XML");

                const items = Array.from(xml.querySelectorAll("item")).slice(0, 8);
                if (items.length === 0) throw new Error("Không tìm thấy thẻ <item>");

                logDebug(`Thành công luồng ${name}: ${items.length} mục.`);
                
                return items.map(item => ({
                    title: item.querySelector("title")?.textContent || "Văn bản",
                    link: item.querySelector("link")?.textContent || "#",
                    pubDate: item.querySelector("pubDate")?.textContent || ""
                }));
            } catch (e) {
                logDebug(`Proxy ${i + 1} lỗi cho ${name}: ${e.message}`, true);
                if (i === proxies.length - 1) return []; // Nếu là proxy cuối cùng thì mới bỏ cuộc
                logDebug(`Đang thử lại ${name} với Proxy dự phòng...`);
            }
        }
    };

    try {
        const vb = await fetchRSS("Văn bản", feeds.vanban);
        const dt = await fetchRSS("Dự thảo", feeds.duthao);
        const cv = await fetchRSS("Công văn", feeds.congvan);

        if (vb.length === 0 && dt.length === 0 && cv.length === 0) {
            throw new Error("Không lấy được bất kỳ dữ liệu nào từ các luồng RSS.");
        }

        renderLawGrid({ vanban: vb, duthao: dt, congvan: cv });
    } catch (e) {
        logDebug(`TỔNG LỖI: ${e.message}`, true);
        listEl.innerHTML = `
            <div style='text-align:center; padding:40px; grid-column: span 3; color: #EF4444;'>
                <p>⚠️ Radar không thể hiển thị dữ liệu tự động.</p>
                <button class="btn-primary" onclick="window.open('https://thuvienphapluat.vn/tra-cuu-phap-luat-moi.aspx', '_blank')" style="margin-top:15px;">Mở trang gốc Thư Viện Pháp Luật ↗️</button>
            </div>
        `;
    }
}

function renderLawGrid(data) {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;

    const createCards = (items, color) => items.map(item => {
        const date = new Date(item.pubDate);
        const formattedDate = isNaN(date.getTime()) ? "Mới" : date.toLocaleDateString('vi-VN');
        return `
            <div class="law-card" style="border-left: 4px solid ${color};" onclick="window.open('${item.link}', '_blank')">
                <span class="law-title" style="font-size:0.85rem; line-height:1.4;">${item.title}</span>
                <div class="law-meta">📅 ${formattedDate}</div>
            </div>
        `;
    }).join('');

    listEl.innerHTML = `
        <div class="law-grid">
            <div class="law-column"><h3>⚖️ Văn bản mới</h3>${data.vanban.length ? createCards(data.vanban, '#4F46E5') : '<p>Trống</p>'}</div>
            <div class="law-column"><h3>📝 Dự thảo mới</h3>${data.duthao.length ? createCards(data.duthao, '#F59E0B') : '<p>Trống</p>'}</div>
            <div class="law-column"><h3>✉️ Công văn mới</h3>${data.congvan.length ? createCards(data.congvan, '#10B981') : '<p>Trống</p>'}</div>
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

function toggleFocusMode() { 
    document.body.classList.toggle('focus-mode'); 
}

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

function openChat(url) { 
    window.open(url, '_blank', 'width=1100,height=850'); 
}

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
