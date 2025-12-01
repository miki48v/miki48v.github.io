// Lightweight copy of the app logic adapted for games (stores under `gameList`)
const list = document.getElementById('list');
const addForm = document.getElementById('addForm');
const exportPanel = document.getElementById('exportPanel');
const importFilePanel = document.getElementById('importFilePanel');
const importPanel = document.getElementById('importPanel');
const menuToggle = document.getElementById('menuToggle');
const sidePanel = document.getElementById('sidePanel');
const backdrop = document.getElementById('backdrop');
const sideClose = document.getElementById('sideClose');
const chooseFilePanel = document.getElementById('chooseFilePanel');
const importFileNamePanel = document.getElementById('importFileNamePanel');
const hiddenHeart = document.getElementById('hiddenHeart');

// Use a separate storage key for games so the lists app and games app stay separate
let items = JSON.parse(localStorage.getItem('gameList')) || [];
let editingId = null;
// persisted UI state (filter + type + search)
let currentFilter = localStorage.getItem('gameList.filter') || 'all';
let currentTypeFilter = localStorage.getItem('gameList.type') || 'all';
let currentSearch = localStorage.getItem('gameList.search') || '';

function save() {
    localStorage.setItem('gameList', JSON.stringify(items));
}

function renderList() {
    list.innerHTML = '';
    items.forEach((item) => {
        const itemStatusClass = (item.status || 'Wishlist').toString().toLowerCase().replace(/\s+/g, '-');
        if (currentFilter !== 'all' && itemStatusClass !== currentFilter) return;
        if (currentTypeFilter !== 'all' && item.type !== currentTypeFilter) return;
        if (currentSearch && !String(item.title || '').toLowerCase().includes(currentSearch.toLowerCase())) return;

        const div = document.createElement('div');
        const statusClass = (item.status || 'Wishlist').toString().toLowerCase().replace(/\s+/g, '-');
        div.className = 'item ' + statusClass;
        div.setAttribute('data-status', statusClass);
        div.tabIndex = 0;
        div.setAttribute('data-id', item.id);

        // type icon (game-themed)
        const typeIcon = document.createElement('div');
        typeIcon.className = 'type-icon';
        let emoji = '';
        if ((item.type || '').toLowerCase().includes('pc')) emoji = 'PC';
        else if ((item.type || '').toLowerCase().includes('aaa')) emoji = '★';
        else if ((item.type || '').toLowerCase().includes('indie')) emoji = 'I';
        else emoji = 'G';
        typeIcon.textContent = emoji;
        div.appendChild(typeIcon);

        const coverWrap = document.createElement('div');
        coverWrap.className = 'cover-wrap';

        const img = document.createElement('img');
        img.className = 'cover';
        img.alt = item.title || 'Portada';
        img.loading = 'lazy';
        img.src = item.image || '';
        img.style.display = item.image ? 'block' : 'none';
        img.addEventListener('error', () => {
            img.style.display = 'none';
            placeholder.style.display = 'flex';
        });

        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.display = item.image ? 'none' : 'flex';
        placeholder.textContent = '🎮';

        coverWrap.appendChild(img);
        coverWrap.appendChild(placeholder);
        div.appendChild(coverWrap);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const bodyContent = document.createElement('div');
        bodyContent.className = 'card-body-content';

        const miniTitle = document.createElement('div');
        miniTitle.className = 'card-title-compact';
        miniTitle.textContent = item.title || 'Sin título';
        bodyContent.appendChild(miniTitle);

        const meta = document.createElement('div');
        meta.className = 'card-meta';
        const typeSpan = document.createElement('span');
        typeSpan.className = 'chip type-chip';
        typeSpan.textContent = item.type || '';
        const statusSpan = document.createElement('span');
        statusSpan.className = 'chip status-chip ' + (item.status ? item.status.toLowerCase().replace(' ', '-') : 'wishlist');
        statusSpan.textContent = item.status ? item.status : 'Wishlist';
        meta.appendChild(typeSpan);
        meta.appendChild(statusSpan);
        bodyContent.appendChild(meta);

        // platform if present
        if (item.platform) {
            const plat = document.createElement('div');
            plat.className = 'card-meta';
            const p = document.createElement('span');
            p.className = 'chip type-chip';
            p.textContent = String(item.platform).slice(0, 80);
            plat.appendChild(p);
            bodyContent.appendChild(plat);
        }

        cardBody.appendChild(bodyContent);
        div.appendChild(cardBody);

        const details = document.createElement('div');
        details.className = 'details';
        const actions = document.createElement('div');
        actions.className = 'actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', (ev) => { ev.stopPropagation(); startEdit(item.id); });

        const delButton = document.createElement('button');
        delButton.type = 'button';
        delButton.textContent = 'Eliminar';
        delButton.addEventListener('click', (ev) => { ev.stopPropagation(); deleteItem(item.id); });

        actions.appendChild(editButton);
        actions.appendChild(delButton);
        details.appendChild(actions);
        div.appendChild(details);

        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            const opened = document.querySelectorAll('.item.open');
            opened.forEach(o => { if (o !== div) o.classList.remove('open'); });
            div.classList.toggle('open');
        });
        div.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.classList.toggle('open'); } });

        list.appendChild(div);
    });

    const visibleCount = document.querySelectorAll('#list .item').length;
    list.setAttribute('aria-label', `Juegos — ${visibleCount} elementos`);
    updateCounts();
}

function updateCounts() {
    const counts = { all: 0, wishlist: 0, jugando: 0, completado: 0, abandonado: 0 };
    items.forEach(it => {
        if (currentTypeFilter !== 'all' && it.type !== currentTypeFilter) return;
        if (currentSearch && !String(it.title || '').toLowerCase().includes(currentSearch.toLowerCase())) return;
        counts.all += 1;
        const s = (it.status || 'Wishlist').toString().toLowerCase().replace(/\s+/g, '-');
        if (counts[s] !== undefined) counts[s] += 1;
    });
    document.querySelectorAll('.filter-btn .count').forEach(el => {
        const key = el.parentElement.getAttribute('data-filter');
        el.textContent = String(counts[key] || 0);
    });
}

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const image = document.getElementById('image').value.trim();
    const type = document.getElementById('type').value;
    const platform = document.getElementById('platform') ? document.getElementById('platform').value.trim() : '';
    const status = document.getElementById('status').value;

    if (!title) return;

    if (editingId) {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
            items[idx] = { ...items[idx], title, image, type, status, platform };
        }
        editingId = null;
    } else {
        const id = Date.now().toString();
        items.push({ id, title, image, type, status, platform });
    }

    save();
    renderList();
    addForm.reset();
});

function startEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('title').value = item.title;
    document.getElementById('image').value = item.image || '';
    document.getElementById('type').value = item.type;
    document.getElementById('status').value = item.status;
    document.getElementById('platform').value = item.platform || '';
    editingId = id;
}

function deleteItem(id) {
    if (!confirm('¿Eliminar este juego? Esta acción no puede deshacerse.')) return;
    items = items.filter(i => i.id !== id);
    save();
    renderList();
}

function exportJSON() {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gameList.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exportación completada — descarga iniciada', 'success');
}

function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!Array.isArray(parsed)) throw new Error('Formato inválido');
            const normalized = parsed.map(entry => ({
                id: entry.id || Date.now().toString() + Math.random().toString(36).slice(2,7),
                title: String(entry.title || '').slice(0,200),
                image: entry.image || '',
                type: entry.type || 'PC (Steam)',
                status: entry.status || 'Wishlist',
                platform: entry.platform || 'Steam'
            }));

            const replace = confirm('¿Quieres reemplazar la lista actual con el archivo importado? (Aceptar = reemplazar, Cancelar = fusionar)');
            if (replace) items = normalized; else items = items.concat(normalized);

            save();
            renderList();
            showToast('Importación completada', 'success');
            setTimeout(() => { if (!sidePanel.hidden) { const ev = new KeyboardEvent('keydown', { key: 'Escape' }); document.dispatchEvent(ev); } }, 700);
        } catch (err) {
            showToast('Error al importar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

importPanel && importPanel.addEventListener('click', () => {
    if (!importFilePanel.files || !importFilePanel.files[0]) { alert('Primero selecciona un archivo JSON usando "Seleccionar archivo".'); return; }
    importJSON(importFilePanel.files[0]);
});
exportPanel && exportPanel.addEventListener('click', exportJSON);

hiddenHeart && hiddenHeart.addEventListener('click', () => {
    const msg = document.getElementById('secretMessage');
    const show = msg.classList.toggle('show');
    hiddenHeart.setAttribute('aria-pressed', String(show));
});

// side panel behavior (same as original app)
if (menuToggle && sidePanel && backdrop) {
    const openPanel = () => { menuToggle.setAttribute('aria-expanded','true'); sidePanel.hidden = false; sidePanel.setAttribute('aria-hidden','false'); backdrop.hidden = false; backdrop.setAttribute('aria-hidden','false'); sidePanel.classList.add('open'); backdrop.classList.add('open'); const first = sidePanel.querySelector('button, [tabindex]:not([tabindex="-1"])'); if (first) first.focus(); };
    const closePanel = () => { menuToggle.setAttribute('aria-expanded','false'); sidePanel.classList.remove('open'); backdrop.classList.remove('open'); setTimeout(() => { sidePanel.hidden = true; sidePanel.setAttribute('aria-hidden','true'); backdrop.hidden = true; backdrop.setAttribute('aria-hidden','true'); menuToggle.focus(); }, 220); };

    function trapFocus(e) { if (sidePanel.hidden) return; const focusables = sidePanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); if (!focusables.length) return; const first = focusables[0]; const last = focusables[focusables.length - 1]; if (e.key === 'Tab') { if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } } else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } } } }

    document.addEventListener('keydown', (ev) => { if (!sidePanel.hidden) trapFocus(ev); });
    menuToggle.addEventListener('click', () => { const expanded = menuToggle.getAttribute('aria-expanded') === 'true'; if (expanded) closePanel(); else openPanel(); });
    sideClose && sideClose.addEventListener('click', closePanel);
    backdrop && backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !sidePanel.hidden) closePanel(); });
    if (chooseFilePanel && importFilePanel && importFileNamePanel) { chooseFilePanel.addEventListener('click', () => importFilePanel.click()); importFilePanel.addEventListener('change', () => { const f = importFilePanel.files[0]; importFileNamePanel.textContent = f ? f.name : 'Ningún archivo seleccionado'; }); }
}

// init
renderList();

// toasts (shared behavior)
const toastEl = document.getElementById('toast');
let toastTimeout = null;
function showToast(text, type = 'success', duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
    toastEl.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toastEl.className = 'toast'; toastEl.hidden = true; }, duration);
}

// backward compatibility aliases
try { window.editItem = window.editItem || startEdit; } catch(e) {}
try { window.deleteItem = window.deleteItem || deleteItem; } catch(e) {}
try { window.exportJSON = window.exportJSON || exportJSON; } catch(e) {}
try { window.importJSON = window.importJSON || importJSON; } catch(e) {}
