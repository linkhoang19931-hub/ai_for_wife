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

// Legal Documents Logic - Fetching from Thuvienphapluat.vn RSS
async function fetchLegalDocs() {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;
    listEl.innerHTML = "<div style='text-align:center; padding:20px; grid-column: span 3;'>🔍 Đang kết nối Thư Viện Pháp Luật...</div>";
    
    const feeds = {
        vanban: 'https://thuvienphapluat.vn/rss/vbm.rss',
        duthao: 'https://thuvienphapluat.vn/rss/dt.rss',
        congvan: 'https://thuvienphapluat.vn/rss/cv.rss'
    };

    const fetchRSS = async (url) => {
        try {
            const proxyURL = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const response = await fetch(proxyURL);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const items = Array.from(xml.querySelectorAll("item")).slice(0, 10);
            
            return items.map(item => ({
                title: item.querySelector("title")?.textContent || "Không có tiêu đề",
                link: item.querySelector("link")?.textContent || "#",
                pubDate: item.querySelector("pubDate")?.textContent || "",
                description: item.querySelector("description")?.textContent || ""
            }));
        } catch (e) {
            console.error("Lỗi fetch RSS:", url, e);
            return [];
        }
    };

    try {
        const [vb, dt, cv] = await Promise.all([
            fetchRSS(feeds.vanban),
            fetchRSS(feeds.duthao),
            fetchRSS(feeds.congvan)
        ]);

        renderLawGrid({
            vanban: vb,
            duthao: dt,
            congvan: cv
        });
    } catch (e) {
        listEl.innerHTML = "<div style='text-align:center; padding:20px; grid-column: span 3; color: #EF4444;'>⚠️ Không thể kết nối với nguồn dữ liệu. Hãy thử tải lại trang.</div>";
    }
}

function renderLawGrid(data) {
    const listEl = document.getElementById('law-list');
    if (!listEl) return;

    const createCards = (items, color) => items.map(item => {
        // Trích xuất số hiệu nếu có (thường nằm ở đầu tiêu đề)
        const docNumMatch = item.title.match(/[0-9\/]+[A-ZĐ-]+[0-9]*/);
        const docNum = docNumMatch ? docNumMatch[0] : "Văn bản";

        return `
            <div class="law-card" style="border-left: 4px solid ${color};" onclick="window.open('${item.link}', '_blank')">
                <span class="law-title" style="cursor:pointer; font-size:0.85rem;">${item.title}</span>
                <div class="law-meta">
                    <span>📄 ${docNum}</span>
                    <span>📅 ${new Date(item.pubDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <div style="font-size:0.7rem; color: #6B7280; margin-top:5px;">🌐 Nhấn để xem chi tiết trên TVPL</div>
            </div>
        `;
    }).join('');

    listEl.innerHTML = `
        <div class="law-grid">
            <div class="law-column">
                <h3>⚖️ Văn bản mới</h3>
                ${data.vanban.length ? createCards(data.vanban, '#4F46E5') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Đang tải hoặc không có dữ liệu</p>'}
            </div>
            <div class="law-column">
                <h3>📝 Dự thảo</h3>
                ${data.duthao.length ? createCards(data.duthao, '#F59E0B') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Đang tải hoặc không có dữ liệu</p>'}
            </div>
            <div class="law-column">
                <h3>✉️ Công văn</h3>
                ${data.congvan.length ? createCards(data.congvan, '#10B981') : '<p style="font-size:0.8rem; color:gray; text-align:center;">Đang tải hoặc không có dữ liệu</p>'}
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
