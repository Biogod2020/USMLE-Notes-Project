
let knowledgeBase = {};
let activeTopicId = null;
let fuse = null;
let currentNetwork = null; // track vis.js instance

const EMOJI_MAP = {
disease: '🦠', structure: '🔬', process: '⚙️',
substance: '💊', finding: '🩺', concept: '🧠'
};
const getEmoji = (type) => EMOJI_MAP[type] || '💡';

/* ---------- Relation display mapping (normalize verbs & opposites) ---------- */
// family 用于选择不同色系；out 表示 From（本主题为主语），in 表示 To（对方为主语）
const RELATION_DISPLAY = {
causes:                { family: 'path',      out: 'causes',              in: 'is caused by' },
is_manifestation_of:   { family: 'path',      out: 'manifests as',        in: 'is manifestation of' },

treated_by:            { family: 'therapy',   out: 'treated by',          in: 'treats' },
is_treatment_for:      { family: 'therapy',   out: 'treats',              in: 'is treatment for' },

diagnosed_by:          { family: 'diagnosis', out: 'diagnosed by',        in: 'diagnoses' },
is_diagnostic_for:     { family: 'diagnosis', out: 'diagnoses',           in: 'is diagnostic for' },

secretes_excess:       { family: 'biochem',   out: 'secretes excess',     in: 'is secreted in excess by' },

associated_with:       { family: 'assoc',     out: 'associated with',     in: 'associated with' },
};
const fallbackLabel = (t) => (t || '').replace(/_/g,' ');
const labelFor = (t, dir) => (RELATION_DISPLAY[t]?.[dir]) || fallbackLabel(t);
function chipStyleFor(type, isDark){
const fam = RELATION_DISPLAY[type]?.family;
const tone = isDark ? 'dark' : 'light';
if (fam === 'therapy')   return `background:var(--c-substance-bg-${tone});color:var(--c-substance-${tone})`;
if (fam === 'diagnosis') return `background:var(--c-finding-bg-${tone});color:var(--c-finding-${tone})`;
if (fam === 'path')      return `background:var(--c-process-bg-${tone});color:var(--c-process-${tone})`;
if (fam === 'biochem')   return `background:var(--c-concept-bg-${tone});color:var(--c-concept-${tone})`;
if (fam === 'assoc')     return `background:var(--bg-alt-color);color:var(--text-muted)`;
return `background:var(--bg-alt-color);color:var(--text-muted)`;
}

/* ---------------------------- Search indexing ----------------------------- */
function initializeSearchIndex() {
const stripHtml = (html) => (new DOMParser().parseFromString(html, 'text/html')).body.textContent || '';
const generateAcronym = (title) => {
    const words = title.split(' ').filter(word => /^[A-Z]/.test(word));
    return words.length > 1 ? words.map(w => w[0]).join('') : '';
};
const searchableData = Object.entries(knowledgeBase)
    .filter(([id]) => !id.startsWith('zzz_'))
    .map(([id, topic]) => {
    const fullContent = Object.values(topic.content || {}).map(stripHtml).join(' ');
    return { id, title: topic.title, acronym: generateAcronym(topic.title), primaryType: topic.primaryType, tags: topic.tags || [], fullContent };
    });
const fuseOptions = {
    keys: [{ name: 'title', weight: 1.0 }, { name: 'acronym', weight: 0.9 }, { name: 'tags', weight: 0.7 }, { name: 'fullContent', weight: 0.2 }],
    includeScore: true, threshold: 0.4, minMatchCharLength: 2, ignoreLocation: true
};
fuse = new Fuse(searchableData, fuseOptions);
}

function filterTopics(event) {
if (!fuse) return;
const searchTerm = event.target.value.trim();
if (!searchTerm) { renderNav(); return; }
const results = fuse.search(searchTerm);
renderSearchResults(results);
}

function renderSearchResults(results) {
const navList = document.getElementById('nav-list');
navList.innerHTML = '';
if (results.length === 0) {
    const noResults = document.createElement('li');
    noResults.textContent = 'No results found.';
    noResults.style.padding = '0.5rem 0.75rem';
    noResults.style.color = 'var(--text-muted)';
    navList.appendChild(noResults);
    return;
}
results.forEach(result => {
    const topic = knowledgeBase[result.item.id];
    if (!topic) return;
    const relevance = (1 - result.score) * 100;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.id = `nav-${topic.id}`;
    link.onclick = () => showTopic(result.item.id);
    link.innerHTML = `
    <span class="topic-title">
        <span class="emoji">${getEmoji(topic.primaryType)}</span>
        <span>${topic.title}</span>
    </span>
    <span class="relevance-score" title="Relevance Score">${relevance.toFixed(0)}%</span>`;
    if (result.item.id === activeTopicId) link.classList.add('active');
    item.appendChild(link);
    navList.appendChild(item);
});
}

function initializeApp() {
renderNavPanelBase();
setupTheme();
setupPopover();
showWelcomeMessage();
}

function renderNavPanelBase() {
document.querySelector('.nav-panel').innerHTML = `
    <div class="nav-controls">
    <input type="file" id="json-importer" multiple accept=".json" style="display:none;">
    <label for="json-importer" class="import-btn"><span class="emoji">📥</span>Import</label>
    <button id="theme-toggle" class="theme-btn" title="Toggle Theme"><span class="emoji">🎨</span>Theme</button>
    </div>
    <input type="text" id="search-input" placeholder="🔍 Search (e.g., 'UC', 'fistula', 'cronhs')...">
    <div id="nav-content">
    <h3>Topics</h3>
    <ul id="nav-list"><li>No topics loaded.</li></ul>
    </div>`;
document.getElementById('json-importer').addEventListener('change', handleFileSelect);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('search-input').addEventListener('input', filterTopics);
}

function showWelcomeMessage() {
document.getElementById('main-panel').innerHTML =
    '<div style="text-align:center; margin-top: 4rem;"><h2><span class="emoji">👋</span> Welcome to your Knowledge Engine</h2><p style="color:var(--text-muted)">Import one or more JSON files to begin. Enjoy the new hierarchical navigation and ranked search!</p></div>';
document.getElementById('connections-panel').innerHTML = '';
}

function setupTheme() {
const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', currentTheme);
}

function toggleTheme() {
const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
// 主题切换后，右栏颜色用 CSS 变量会自动适配；vis-network 颜色已用解析方案
}

async function handleFileSelect(event) {
const files = event.target.files;
if (files.length === 0) return;
let newTopicsCount = 0, updatedTopicsCount = 0;
const fileReadPromises = Array.from(files).map(file => file.text().then(JSON.parse));
try {
    const allNewData = await Promise.all(fileReadPromises);
    allNewData.forEach(data => {
    for (const key in data) {
        if (key.startsWith('zzz_')) continue;
        if (!knowledgeBase[key]) newTopicsCount++; else updatedTopicsCount++;
        knowledgeBase[key] = data[key];
    }
    });
    alert(`Import successful!\n- ${newTopicsCount} new topics added.\n- ${updatedTopicsCount} topics updated.`);
    initializeSearchIndex();
    renderUI();
} catch (error) {
    console.error('Error reading/parsing JSON:', error);
    alert('Import failed. Please check file format.');
}
event.target.value = '';
}

function renderUI() {
document.getElementById('search-input').value = '';
renderNav();
const firstTopicId = Object.keys(knowledgeBase)
    .sort((a,b) => knowledgeBase[a].title.localeCompare(knowledgeBase[b].title))[0];
if (firstTopicId) showTopic(firstTopicId);
}

function renderNav() {
const navList = document.getElementById('nav-list');
navList.innerHTML = '';
const navTree = {};
Object.entries(knowledgeBase)
    .filter(([id, topic]) => topic.classificationPath && topic.classificationPath.length > 0)
    .sort(([, a], [, b]) => a.title.localeCompare(b.title))
    .forEach(([id, topic]) => {
    let currentNode = navTree;
    topic.classificationPath.forEach((pathPart, index) => {
        if (!currentNode[pathPart]) {
        currentNode[pathPart] = { _children: {}, _items: [] };
        }
        if (index === topic.classificationPath.length - 1) {
        currentNode[pathPart]._items.push({ id, ...topic });
        }
        currentNode = currentNode[pathPart]._children;
    });
    });

function createNavHtml(treeNode) {
    const ul = document.createElement('ul');
    const sortedKeys = Object.keys(treeNode).sort();
    for (const key of sortedKeys) {
    const node = treeNode[key];
    const li = document.createElement('li');
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = key;
    details.appendChild(summary);
    if (Object.keys(node._children).length > 0) {
        details.appendChild(createNavHtml(node._children));
    }
    if (node._items.length > 0) {
        const itemUl = document.createElement('ul');
        node._items.forEach(topic => {
        const itemLi = document.createElement('li');
        const link = document.createElement('a');
        link.id = `nav-${topic.id}`;
        link.onclick = () => showTopic(topic.id);
        link.innerHTML = `<span class="topic-title"><span class="emoji">${getEmoji(topic.primaryType)}</span><span>${topic.title}</span></span>`;
        itemLi.appendChild(link);
        itemUl.appendChild(itemLi);
        });
        details.appendChild(itemUl);
    }
    li.appendChild(details);
    ul.appendChild(li);
    }
    return ul;
}

const navHtml = createNavHtml(navTree);
navList.appendChild(navHtml);
updateActiveNav();
}

function updateActiveNav() {
document.querySelectorAll('.nav-panel a.active').forEach(el => el.classList.remove('active'));
if (activeTopicId) {
    const activeLink = document.getElementById(`nav-${activeTopicId}`);
    if (activeLink) {
    activeLink.classList.add('active');
    let parent = activeLink.closest('details');
    while (parent) {
        parent.open = true;
        parent = parent.parentElement.closest('details');
    }
    }
}
}

function parseAndLinkContent(text) {
if (!text) return '';
return text.replace(/\[\[([a-zA-Z0-9_]+)(?:\|(.+?))?\]\]/g, (match, topicId, displayText) => {
    if (knowledgeBase[topicId]) {
    const linkText = displayText || knowledgeBase[topicId].title;
    return `<a class="internal-link" data-topic-id="${topicId}" onclick="showTopic('${topicId}')">${linkText}</a>`;
    }
    return `<em>${displayText || topicId}</em>`;
});
}

function showTopic(topicId) {
if (!knowledgeBase[topicId]) return;
activeTopicId = topicId;
const topic = knowledgeBase[topicId];
const mainPanel = document.getElementById('main-panel');
mainPanel.className = `main-panel type-${topic.primaryType || 'concept'}`;

updateActiveNav();

const tagsHtml = topic.tags ? `<div class="tags-container">${topic.tags.map(t => `<span class="tag-item">${t}</span>`).join('')}</div>` : '';
const pathHtml = topic.classificationPath ? `<div class="classification-path"><span class="emoji">🗺️</span> ${topic.classificationPath.join(' &rsaquo; ')}</div>` : '';
mainPanel.innerHTML = `
    <div class="topic-header">
    <div class="topic-header-main">
        <div class="topic-icon">${getEmoji(topic.primaryType)}</div>
        <div>
        <h2>${topic.title}</h2>
        ${tagsHtml}
        </div>
    </div>
    <button onclick="showGraphModal('${topicId}')"><span class="emoji">🕸️</span>Graph View</button>
    </div>
    <h4><span class="emoji">👀</span>At a Glance</h4>
    <div class="at-a-glance">${parseAndLinkContent(topic.content?.atAGlance || '')}</div>
    ${pathHtml}
    ${Object.keys(topic.content || {}).filter(k => !['definition', 'atAGlance', 'takeAway'].includes(k)).map(k => `<h4>${k.charAt(0).toUpperCase() + k.slice(1)}</h4><p>${parseAndLinkContent(topic.content[k])}</p>`).join('')}
    <div style="background:var(--bg-alt-color); padding:1rem; border-radius:var(--radius-md); margin-top:2rem;">
    <h4><span class="emoji">🔑</span>Key Take Away</h4>
    <p>${parseAndLinkContent(topic.content?.takeAway || '')}</p>
    </div>`;
renderConnections(topicId);
mainPanel.scrollTop = 0;
}

/* --------------------- Connections (active-voice, clearer) --------------------- */
function renderConnections(topicId) {
const connectionsPanel = document.getElementById('connections-panel');
const topic = knowledgeBase[topicId];
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

// Outgoing: 本主题 → 其他
let outHtml = `<h3><span class="emoji">🔗</span>Connections</h3><h4>From ${topic.title}</h4><ul>`;
if (Array.isArray(topic.connections) && topic.connections.length > 0) {
    topic.connections.forEach(conn => {
    const other = knowledgeBase[conn.to];
    if (!other) return;
    const label = labelFor(conn.type, 'out');           // 统一主动态
    const style = chipStyleFor(conn.type, isDark);
    outHtml += `
        <li>
        <span class="connection-label" style="${style}">→ ${label}</span>
        <a class="internal-link" data-topic-id="${conn.to}" onclick="showTopic('${conn.to}')">${other.title}</a>
        </li>`;
    });
} else {
    outHtml += `<li>None</li>`;
}
outHtml += `</ul>`;

// Incoming: 其他 → 本主题
const backlinks = Object.keys(knowledgeBase).reduce((acc, id) => {
    const item = knowledgeBase[id];
    item?.connections?.forEach(c => { if (c.to === topicId) acc.push({ from: id, type: c.type }); });
    return acc;
}, []);
backlinks.sort((a,b)=> knowledgeBase[a.from].title.localeCompare(knowledgeBase[b.from].title));

let inHtml = `<h4>To ${topic.title}</h4><ul>`;
if (backlinks.length > 0) {
    backlinks.forEach(link => {
    const other = knowledgeBase[link.from];
    if (!other) return;
    const label = labelFor(link.type, 'in');            // 反义/主动态（如 diagnoses / treats）
    const style = chipStyleFor(link.type, isDark);
    inHtml += `
        <li>
        <a class="internal-link" data-topic-id="${link.from}" onclick="showTopic('${link.from}')">${other.title}</a>
        <span class="connection-label" style="${style}">${label} →</span>
        </li>`;
    });
} else {
    inHtml += `<li>No incoming links.</li>`;
}
inHtml += `</ul>`;

connectionsPanel.innerHTML = outHtml + inHtml;
}

function setupPopover() {
const popover = document.getElementById('popover');
document.body.addEventListener('mouseover', e => {
    const link = e.target.closest('.internal-link');
    if (link) {
    const topicId = link.dataset.topicId;
    const topic = knowledgeBase[topicId];
    popover.innerHTML = `<h4>${getEmoji(topic?.primaryType)} ${topic?.title || ''}</h4><p>${topic?.content?.definition || ''}</p>`;
    popover.style.display = 'block';
    const rect = link.getBoundingClientRect();
    popover.style.left = `${rect.left + window.scrollX}px`;
    popover.style.top = `${rect.top + window.scrollY - popover.offsetHeight - 10}px`;
    }
});
document.body.addEventListener('mouseout', e => {
    const link = e.target.closest('.internal-link');
    if (link) { popover.style.display = 'none'; }
});
}

// === Graph View (fixed) ===
function showGraphModal(centerNodeId) {
if (!centerNodeId || !knowledgeBase[centerNodeId]) {
    console.warn('Graph center node missing:', centerNodeId);
    return;
}
const modal = document.getElementById('graph-modal');
modal.style.display = "block";

setTimeout(() => {
    const connectedNodes = new Set([centerNodeId]);
    knowledgeBase[centerNodeId]?.connections?.forEach(conn => connectedNodes.add(conn.to));
    Object.keys(knowledgeBase).forEach(id => {
    knowledgeBase[id]?.connections?.forEach(conn => {
        if (conn.to === centerNodeId) connectedNodes.add(id);
    });
    });

    const nodesData = Array.from(connectedNodes)
    .filter(id => knowledgeBase[id])
    .map(id => ({
        id,
        label: `${getEmoji(knowledgeBase[id].primaryType)} ${knowledgeBase[id].title}`,
        group: knowledgeBase[id].primaryType
    }));

    const edgesData = Array.from(connectedNodes).flatMap(nodeId =>
    knowledgeBase[nodeId]?.connections
        ?.filter(c => connectedNodes.has(c.to))
        .map(c => ({
        from: nodeId,
        to: c.to,
        label: c.type.replace(/_/g,' '),
        arrows: 'to'
        })) || []
    );

    const container = document.getElementById('graph-container');
    const data = {
    nodes: new vis.DataSet(nodesData),
    edges: new vis.DataSet(edgesData)
    };

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    // 将 CSS 变量解析为真实颜色字符串，避免 Canvas 无法识别 var(--xxx)
    const css = getComputedStyle(document.documentElement);
    const groupColors = Object.fromEntries(
    Object.keys(EMOJI_MAP).map(type => {
        const bg = css.getPropertyValue(`--c-${type}-${isDark ? 'bg-dark' : 'bg-light'}`).trim();
        const bd = css.getPropertyValue(`--c-${type}-${isDark ? 'dark' : 'light'}`).trim();
        return [type, { color: { background: bg || '#ffffff', border: bd || '#333333' } }];
    })
    );

    const options = {
    nodes: {
        shape: 'box',
        borderWidth: 2,
        font: { size: 14, color: isDark ? '#e5e7eb' : '#212529' },
        margin: { top: 10, right: 15, bottom: 10, left: 15 }
    },
    edges: {
        width: 2,
        font: { size: 10, align: 'middle', color: isDark ? '#9ca3af' : '#6c757d', strokeWidth: 0 }
    },
    physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -100, springLength: 150, centralGravity: 0.01 }
    },
    groups: groupColors
    };

    if (currentNetwork) {
    currentNetwork._resizeObserver?.disconnect?.();
    currentNetwork.destroy();
    currentNetwork = null;
    }

    currentNetwork = new vis.Network(container, data, options);

    currentNetwork.once('stabilized', () => currentNetwork && currentNetwork.fit({ animation: { duration: 300, easing: 'easeInOutQuad' } }));
    currentNetwork.fit();

    const ro = new ResizeObserver(() => currentNetwork && currentNetwork.fit());
    ro.observe(container);
    currentNetwork._resizeObserver = ro;

    currentNetwork.on('selectNode', (params) => {
    if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        closeModal('graph-modal');
        showTopic(nodeId);
    }
    });

}, 0);
}

function closeModal(modalId) {
document.getElementById(modalId).style.display = "none";
if (modalId === 'graph-modal' && currentNetwork) {
    currentNetwork._resizeObserver?.disconnect?.();
    currentNetwork.destroy();
    currentNetwork = null;
}
}

// 原有代码：
// document.addEventListener('DOMContentLoaded', initializeApp);

// 新代码：
async function startApp() {
  // 1. 初始化基础UI
  initializeApp();

  // 2. 自动加载本地数据进行开发
  try {
    // 路径是相对于 index.html 的，所以我们需要从 public 目录往上找到 data 目录
    const response = await fetch('../../data/knowledge_base_complete.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 模拟文件加载成功后的流程
    knowledgeBase = data; // 直接赋值给全局变量
    
    // 初始化搜索和UI
    initializeSearchIndex();
    renderUI();
    console.log("Kai: Development data loaded successfully.");

  } catch (error) {
    console.error("Kai: Error auto-loading development data:", error);
    alert("Could not load local knowledge base. Please import a file manually.");
  }
}

// 启动应用
startApp();
