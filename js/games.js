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

        // actions are available inside the details panel (keeps the card compact)

        // achievements and playtime if present
        if (item.achievements || item.playtime) {
            const statsRow = document.createElement('div');
            statsRow.className = 'card-meta';
            if (item.achievements) {
                const ach = document.createElement('span'); ach.className = 'chip'; ach.textContent = `${item.achievements} logros`; statsRow.appendChild(ach);
            }
            // playtime (hours) if present
            if (item.playtime && Number(item.playtime) > 0) {
                const pt = document.createElement('span'); pt.className = 'chip'; pt.textContent = `≈ ${item.playtime} h`; statsRow.appendChild(pt);
            }
            // compute and show a 'dificultad del platino' estimate based on achievements
            const platino = estimatePlatinumDifficulty(item.achievements || 0);
            if (platino && platino !== 'Desconocida') {
                const plat = document.createElement('span'); plat.className = 'chip platino-chip'; plat.textContent = `🏆 ${platino}`; statsRow.appendChild(plat);
            }
            bodyContent.appendChild(statsRow);
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
    const achievements = document.getElementById('achievements') ? (parseInt(document.getElementById('achievements').value, 10) || 0) : 0;
    const playtime = document.getElementById('playtime') ? (parseFloat(document.getElementById('playtime').value) || 0) : 0;
    const status = document.getElementById('status').value;

    if (!title) return;

        if (editingId) {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
            items[idx] = { ...items[idx], title, image, type, status, platform, achievements, playtime };
        }
        editingId = null;
    } else {
        const id = Date.now().toString();
        items.push({ id, title, image, type, status, platform, achievements, playtime });
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
    // fill new fields
    const achEl = document.getElementById('achievements'); if (achEl) achEl.value = item.achievements || '';
    const playEl = document.getElementById('playtime'); if (playEl) playEl.value = item.playtime || '';
    editingId = id;
    // focus the form so users can edit immediately
    const titleEl = document.getElementById('title'); if (titleEl) { titleEl.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
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

/* ===== RAWG & Steam autofill integration ===== */
let rawgApiKey = localStorage.getItem('rawg.apiKey') || '';
let steamApiKey = localStorage.getItem('steam.apiKey') || '';

const autofillBtnGames = document.getElementById('autofillBtnGames');
// create small modal area used for results
const autofillModalGames = document.createElement('div');
autofillModalGames.className = 'autofill-modal';
autofillModalGames.hidden = true;
autofillModalGames.setAttribute('aria-hidden','true');
autofillModalGames.innerHTML = `
  <div class="autofill-inner">
    <button id="autofillCloseGames" class="side-close" aria-label="Cerrar búsqueda">✕</button>
    <h3>Buscar en RAWG</h3>
    <div id="autofillLoaderGames" class="autofill-loader" hidden>Buscando…</div>
    <div id="autofillResultsGames" class="autofill-results" aria-live="polite"></div>
  </div>
`;
document.body.appendChild(autofillModalGames);

const autofillLoaderGames = () => document.getElementById('autofillLoaderGames');
const autofillResultsGames = () => document.getElementById('autofillResultsGames');

async function fetchFromRAWG(search) {
    if (!search) return [];
    const key = rawgApiKey ? `&key=${encodeURIComponent(rawgApiKey)}` : '';
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(search)}&page_size=8${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('RAWG search failed');
    const json = await res.json();
    return json.results || [];
}

async function fetchRAWGDetails(id) {
    const key = rawgApiKey ? `?key=${encodeURIComponent(rawgApiKey)}` : '';
    const url = `https://api.rawg.io/api/games/${id}${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('RAWG details failed');
    return await res.json();
}

async function fetchSteamSchema(appid) {
    if (!steamApiKey) throw new Error('Steam key missing');
    const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${encodeURIComponent(steamApiKey)}&appid=${encodeURIComponent(appid)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Steam schema fetch failed');
    const j = await r.json();
    return j?.game?.availableGameStats?.achievements || [];
}


// Estimate how hard it would be to get the platinum/trophy using a rough heuristic
function estimatePlatinumDifficulty(count) {
    if (!count || count === 0) return 'Desconocida';
    if (count <= 5) return 'Muy Fácil';
    if (count <= 15) return 'Fácil';
    if (count <= 30) return 'Media';
    if (count <= 60) return 'Difícil';
    return 'Muy Difícil';
}

function openAutofillGames() { autofillModalGames.hidden = false; autofillModalGames.setAttribute('aria-hidden','false'); autofillLoaderGames().hidden = false; autofillResultsGames().innerHTML = ''; }
function closeAutofillGames() { autofillModalGames.hidden = true; autofillModalGames.setAttribute('aria-hidden','true'); }

autofillBtnGames && autofillBtnGames.addEventListener('click', async () => {
    const q = document.getElementById('title').value.trim();
    if (!q) { alert('Escribe el título del juego antes de buscar'); return; }
    openAutofillGames();
    try {
        const results = await fetchFromRAWG(q);
        autofillLoaderGames().hidden = true;
        const container = autofillResultsGames();
        if (!results.length) { container.textContent = 'No se encontraron resultados'; return; }
        for (const g of results) {
            const el = document.createElement('div'); el.className = 'autofill-item';
            const img = document.createElement('img'); img.className = 'autofill-thumb'; img.src = g.background_image || ''; img.alt = g.name || '';
            const meta = document.createElement('div'); meta.className = 'autofill-meta';
            const title = document.createElement('div'); title.className = 'autofill-title'; title.textContent = g.name;
            const sub = document.createElement('div'); sub.className = 'autofill-sub'; sub.textContent = `Playtime ≈ ${g.playtime || '—'} h • Plataformas: ${(g.platforms || []).map(p=>p.platform.name).join(', ')}`;
            meta.appendChild(title); meta.appendChild(sub);
            const actions = document.createElement('div'); actions.className = 'autofill-actions';
            const useBtn = document.createElement('button'); useBtn.className = 'autofill-add'; useBtn.textContent = 'Usar';
            useBtn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                try {
                    const det = await fetchRAWGDetails(g.id);
                    document.getElementById('title').value = det.name || g.name;
                    document.getElementById('image').value = det.background_image || '';
                    document.getElementById('type').value = (det.genres && det.genres[0] && det.genres[0].name) || 'Indie';
                    document.getElementById('platform').value = (det.platforms && det.platforms[0] && det.platforms[0].platform.name) || 'Steam';
                    document.getElementById('achievements').value = det.achievements_count || '';
                    // RAWG provides an average playtime value — copy to the playtime field
                    document.getElementById('playtime').value = (det.playtime || g.playtime) || '';
                    const achCount = det.achievements_count || 0;
                    // attempt steam achievements if store contains steam url
                    const steamStore = (det.stores || []).find(s => s.store && /steam/i.test(String(s.store.slug)));
                    if (steamStore && steamApiKey) {
                        const match = String(steamStore.url).match(/\/app\/(\d+)/);
                        if (match) {
                            try {
                                const achs = await fetchSteamSchema(match[1]);
                                document.getElementById('achievements').value = achs.length || document.getElementById('achievements').value;
                            } catch (err) { console.warn('Steam achievements fetch failed', err); }
                        }
                    }
                    showToast('Autofill completado — revisa los campos', 'success');
                } catch (err) {
                    showToast('Error autofill: ' + (err.message || err), 'error');
                }
                closeAutofillGames();
            });
            actions.appendChild(useBtn);
            el.appendChild(img); el.appendChild(meta); el.appendChild(actions);
            container.appendChild(el);
        }
    } catch (err) {
        autofillLoaderGames().hidden = true; autofillResultsGames().textContent = 'Error: ' + (err.message || err);
    }
});

// modal close
document.addEventListener('click', (e) => { if (e.target && e.target.id === 'autofillCloseGames') closeAutofillGames(); });

// keys UI in the games side panel
const rawgInputEl = document.getElementById('rawgKeyInput');
const steamInputEl = document.getElementById('steamKeyInput');
const saveGamesKeysBtn = document.getElementById('saveGamesKeysBtn');
const clearGamesKeysBtn = document.getElementById('clearGamesKeysBtn');
if (rawgInputEl) rawgInputEl.value = rawgApiKey ? '••••••' : '';
if (steamInputEl) steamInputEl.value = steamApiKey ? '••••••' : '';
saveGamesKeysBtn && saveGamesKeysBtn.addEventListener('click', () => {
    const r = rawgInputEl && rawgInputEl.value.trim();
    const s = steamInputEl && steamInputEl.value.trim();
    if (r && !r.includes('•')) { rawgApiKey = r; localStorage.setItem('rawg.apiKey', rawgApiKey); rawgInputEl.value = '••••••'; }
    if (s && !s.includes('•')) { steamApiKey = s; localStorage.setItem('steam.apiKey', steamApiKey); steamInputEl.value = '••••••'; }
    showToast('Claves guardadas', 'success');
});
clearGamesKeysBtn && clearGamesKeysBtn.addEventListener('click', () => { localStorage.removeItem('rawg.apiKey'); localStorage.removeItem('steam.apiKey'); rawgApiKey = ''; steamApiKey = ''; if (rawgInputEl) rawgInputEl.value = ''; if (steamInputEl) steamInputEl.value = ''; showToast('Claves borradas', 'success'); });

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

// wire up filter/search/type controls (same behavior as the lists app)
document.addEventListener('DOMContentLoaded', () => {
    // filter buttons
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.addEventListener('click', () => setFilter(b.getAttribute('data-filter')));
    });

    // wire type select + search field
    const searchInput = document.getElementById('searchInput');
    const typeSelect = document.getElementById('typeFilter');
    if (searchInput) {
        searchInput.value = currentSearch;
        searchInput.addEventListener('input', (ev) => {
            currentSearch = ev.target.value || '';
            localStorage.setItem('gameList.search', currentSearch);
            renderList();
        });
    }
    if (typeSelect) {
        typeSelect.value = currentTypeFilter;
        typeSelect.addEventListener('change', (ev) => {
            currentTypeFilter = ev.target.value || 'all';
            localStorage.setItem('gameList.type', currentTypeFilter);
            renderList();
        });
    }

    // initialize UI based on persisted filter
    setFilter(currentFilter);
});

// helper to toggle filter buttons
function setFilter(filter) {
    currentFilter = filter || 'all';
    localStorage.setItem('gameList.filter', currentFilter);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        const pressed = f === currentFilter;
        btn.classList.toggle('active', pressed);
        btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });
    renderList();
}

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
