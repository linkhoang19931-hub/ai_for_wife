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
    initDraggableClock(); // Kích hoạt tính năng kéo thả đồng hồ
};

// Tab Switching Logic
function switchTab(mode) {
    console.log("Switching to tab:", mode);
    const tabs = ['edit', 'preview', 'law'];
    
    tabs.forEach(t => {
        const area = document.getElementById(t + '-area');
        const btn = document.getElementById('tab-' + t);
        
        if (area) {
            area.style.display = (t === mode) ? 'block' : 'none';
        }
        if (btn) {
            btn.classList.toggle('active', t === mode);
        }
    });

    const noteArea = document.getElementById('note-area');
    const previewArea = document.getElementById('preview-area');
    const footer = document.querySelector('.editor-footer');
    
    // Tự động ẩn/hiện các thành phần hỗ trợ dựa trên tab
    if (mode === 'law') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'none';
    } else if (mode === 'preview') {
        if(noteArea) noteArea.style.display = 'none';
        if(footer) footer.style.display = 'flex';
        // Render Markdown
        if (typeof marked !== 'undefined' && previewArea) {
            previewArea.innerHTML = marked.parse(noteArea.value || '');
        }
    } else { // 'edit' mode
        if(noteArea) noteArea.style.display = 'block';
        if(footer) footer.style.display = 'flex';
    }
}

// Draggable Clock Logic
function initDraggableClock() {
    const clock = document.querySelector('.cat-clock-pos');
    if (!clock) return;

    let isDragging = false;
    let offset = { x: 0, y: 0 };

    clock.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = clock.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
        clock.style.transition = 'none';
        clock.style.zIndex = 1000;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let x = e.clientX - offset.x;
        let y = e.clientY - offset.y;

        // Giới hạn trong cửa sổ trình duyệt
        x = Math.max(0, Math.min(x, window.innerWidth - 120));
        y = Math.max(0, Math.min(y, window.innerHeight - 160));

        clock.style.left = x + 'px';
        clock.style.top = y + 'px';
        clock.style.right = 'auto'; 
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        clock.style.transition = 'all 0.3s ease-out';
    });
}

// Legal Documents Logic - Fetching from Thuvienphapluat.vn RSS
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='text-align:center; padding:40px; grid-column: span 3;'>🔍 Đang quét radar văn bản pháp luật...</div>";
    
    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    const fetchRSS = async (url) => {
        try {
            const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyURL);
            const data = await response.json();
            const text = data.contents;
            
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const items = Array.from(xml.querySelectorAll("item")).slice(0, 10);
            
            return items.map(item => ({
                title: item.querySelector("title")?.textContent || "Văn bản không tiêu đề",
                link: item.querySelector("link")?.textContent || "#",
                pubDate: item.querySelector("pubDate")?.textContent || new Date().toISOString()
            }));
        } catch (e) {
            console.error("Lỗi fetch RSS:", url, e);
            return [];
        }
    };

    try {
        const vb = await fetchRSS(feeds.vanban);
        const dt = await fetchRSS(feeds.duthao);
        const cv = await fetchRSS(feeds.congvan);

        if (vb.length === 0 && dt.length === 0 && cv.length === 0) {
            throw new Error("Empty data");
        }

        renderLawGrid({ vanban: vb, duthao: dt, congvan: cv });
    } catch (e) {
        listEl.innerHTML = `
            <div style='text-align:center; padding:40px; grid-column: span 3; color: #EF4444;'>
                <p>⚠️ Không thể tải dữ liệu tự động lúc này.</p>
                <button class="btn-primary" onclick="window.open('https://thuvienphapluat.vn/tra-cuu-phap-luat-moi.aspx', '_blank')" style="margin-top:15px;">Mở trang chủ Thư Viện Pháp Luật ↗️</button>
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
            <div class="law-card" style="border-left: 4px solid ${color}; cursor:pointer;" onclick="window.open('${item.link}', '_blank')">
                <span class="law-title" style="font-size:0.85rem; line-height:1.4; display:block; margin-bottom:8px;">${item.title}</span>
                <div class="law-meta">
                    <span style="font-weight:600; color:${color}">📅 ${formattedDate}</span>
                </div>
            </div>
        `;
    }).join('');

    listEl.innerHTML = `
        <div class="law-grid">
            <div class="law-column">
                <h3>⚖️ Văn bản mới</h3>
                ${data.vanban.length ? createCards(data.vanban, '#4F46E5') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Trống</p>'}
            </div>
            <div class="law-column">
                <h3>📝 Dự thảo mới</h3>
                ${data.duthao.length ? createCards(data.duthao, '#F59E0B') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Trống</p>'}
            </div>
            <div class="law-column">
                <h3>✉️ Công văn mới</h3>
                ${data.congvan.length ? createCards(data.congvan, '#10B981') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Trống</p>'}
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
document.addEventListener('input', (e) => {
    if (e.target.id === 'note-area') {
        localStorage.setItem('wife_ai_knowledge', e.target.value);
    }
});

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
