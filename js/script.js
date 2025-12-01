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
const tmdbKeyInput = document.getElementById('tmdbKeyInput');
const saveTmdbKeyBtn = document.getElementById('saveTmdbKeyBtn');
const clearTmdbKeyBtn = document.getElementById('clearTmdbKeyBtn');
const autofillBtn = document.getElementById('autofillBtn');
const autofillModal = document.getElementById('autofillModal');
const autofillBackdrop = document.getElementById('autofillBackdrop');
const autofillClose = document.getElementById('autofillClose');
const autofillResults = document.getElementById('autofillResults');
const autofillLoader = document.getElementById('autofillLoader');

// Use items with stable ids to support editing in-place
let items = JSON.parse(localStorage.getItem('mediaList')) || [];
let editingId = null;
// persisted UI state (filter + type + search)
let currentFilter = localStorage.getItem('mediaList.filter') || 'all';
let currentTypeFilter = localStorage.getItem('mediaList.type') || 'all';
let currentSearch = localStorage.getItem('mediaList.search') || '';
let currentAutofillCandidates = [];
let tmdbApiKey = localStorage.getItem('tmdb.apiKey') || '';

// Helper to persist
function save() {
    localStorage.setItem('mediaList', JSON.stringify(items));
}

function renderList() {
    list.innerHTML = '';
    items.forEach((item) => {
        // skip items that don't match the active filter (status)
        const itemStatusClass = (item.status || 'Pendiente').toString().toLowerCase().replace(/\s+/g, '-');
        if (currentFilter !== 'all' && itemStatusClass !== currentFilter) return;
        // skip items that don't match type filter
        if (currentTypeFilter !== 'all' && item.type !== currentTypeFilter) return;
        // skip items that don't match search query in title
        if (currentSearch && !String(item.title || '').toLowerCase().includes(currentSearch.toLowerCase())) return;
        const div = document.createElement('div');
        // attach status-based class so CSS can style the card edge by state
        const statusClass = (item.status || 'Pendiente').toString().toLowerCase().replace(/\s+/g, '-');
        div.className = 'item ' + statusClass;
        div.setAttribute('data-status', statusClass);
        div.tabIndex = 0; // focusable
        div.setAttribute('data-id', item.id);

        // type icon
        const typeIcon = document.createElement('div');
        typeIcon.className = 'type-icon';
        let emoji = '';
        if (item.type === 'Anime') emoji = 'JP';
        if (item.type === 'Película') emoji = 'TV';
        if (item.type === 'Serie') emoji = 'S';
        if (item.type === 'Mi Vida') emoji = '<3';
        typeIcon.textContent = emoji;

        div.appendChild(typeIcon);

        // cover wrapper (clip image to card top rounded corners) and placeholder
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
        placeholder.textContent = '?';

        coverWrap.appendChild(img);
        coverWrap.appendChild(placeholder);
        div.appendChild(coverWrap);

        // add a body section so the card has a consistent bottom area (prevents visual 'peaks')
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // Fill with minimal info (title, type, status) so body isn't empty
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
        statusSpan.className = 'chip status-chip ' + (item.status ? item.status.toLowerCase().replace(' ', '-') : 'pendiente');
        statusSpan.textContent = item.status ? item.status : 'Pendiente';
        meta.appendChild(typeSpan);
        meta.appendChild(statusSpan);

        // optional episodes/duration information
        if (item.episodes || item.duration) {
            const info = document.createElement('div');
            info.style.marginTop = '8px';
            info.className = 'card-extra';
            const ep = document.createElement('span');
            ep.className = 'chip';
            ep.textContent = item.episodes ? `${item.episodes} ep` : '';
            const est = document.createElement('span');
            est.className = 'chip';
            if (item.episodes && item.duration) {
                const hours = (Number(item.episodes) * Number(item.duration)) / 60;
                est.textContent = `≈ ${Number(hours.toFixed(1))} h`;
            }
            if (ep.textContent) info.appendChild(ep);
            if (est.textContent) info.appendChild(est);
            bodyContent.appendChild(info);
        }

        bodyContent.appendChild(meta);
        cardBody.appendChild(bodyContent);
        div.appendChild(cardBody);

        // details
        const details = document.createElement('div');
        details.className = 'details';

        // Only show action buttons in the dropdown overlay (Edit / Delete)
        // The compact card-body already shows title/type/status when closed.

        const actions = document.createElement('div');
        actions.className = 'actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', (ev) => {
            ev.stopPropagation();
            startEdit(item.id);
        });

        const delButton = document.createElement('button');
        delButton.type = 'button';
        delButton.textContent = 'Eliminar';
        delButton.addEventListener('click', (ev) => {
            ev.stopPropagation();
            deleteItem(item.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(delButton);
        details.appendChild(actions);

        div.appendChild(details);

        // toggle details on click or keyboard
        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            // close other opened items so only one is open at a time
            const opened = document.querySelectorAll('.item.open');
            opened.forEach(o => { if (o !== div) o.classList.remove('open'); });
            // toggle this one
            div.classList.toggle('open');
        });
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                div.classList.toggle('open');
            }
        });

        list.appendChild(div);
    });

    // update count / aria for screen readers (optional, unobtrusive)
    const visibleCount = document.querySelectorAll('#list .item').length;
    list.setAttribute('aria-label', `Lista — ${visibleCount} elementos`);

    // update filter counts (considering type + search filters)
    updateCounts();
}

function updateCounts() {
    const counts = { all: 0, pendiente: 0, 'en-simulcast': 0, viendo: 0, terminado: 0 };
    items.forEach(it => {
        // apply the non-status filters: type + search
        if (currentTypeFilter !== 'all' && it.type !== currentTypeFilter) return;
        if (currentSearch && !String(it.title || '').toLowerCase().includes(currentSearch.toLowerCase())) return;
        counts.all += 1;
        const s = (it.status || 'Pendiente').toString().toLowerCase().replace(/\s+/g, '-');
        if (counts[s] !== undefined) counts[s] += 1;
    });
    document.querySelectorAll('.filter-btn .count').forEach(el => {
        const key = el.parentElement.getAttribute('data-filter');
        el.textContent = String(counts[key] || 0);
    });
}

// filter helpers
function setFilter(filter) {
    currentFilter = filter || 'all';
    localStorage.setItem('mediaList.filter', currentFilter);
    // update UI buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        const active = (f === currentFilter);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    renderList();
}

// ========== AniList autofill integration ===========
async function fetchFromAniList(search) {
    if (!search) return [];
    const query = `query ($search: String) { Page(perPage: 10) { media(search: $search, type: ANIME) { id title { romaji english native } episodes duration format coverImage { large medium } siteUrl description(asHtml: false) } } }`;
    try {
        autofillLoader.hidden = false;
        autofillResults.innerHTML = '';
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { search } })
        });
        const json = await res.json();
        const media = json?.data?.Page?.media || [];
        currentAutofillCandidates = media;
        return media;
    } catch (err) {
        console.warn('AniList lookup failed', err);
        return [];
    } finally {
        autofillLoader.hidden = true;
    }
}

async function fetchFromTMDb(search, type) {
    // type: 'movie' or 'tv'
    if (!tmdbApiKey) throw new Error('TMDb API key not configured');
    const base = 'https://api.themoviedb.org/3';
    const endpoint = type === 'movie' ? '/search/movie' : '/search/tv';
    const url = `${base}${endpoint}?api_key=${encodeURIComponent(tmdbApiKey)}&query=${encodeURIComponent(search)}&page=1&include_adult=false`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('TMDb search failed: ' + r.status);
    const json = await r.json();
    const results = json.results || [];
    // unify shape like AniList so display logic can reuse
    return results.map(it => ({
        id: it.id,
        title: it.title || it.name || '',
        format: type === 'movie' ? 'Movie' : 'TV',
        coverImage: { medium: it.poster_path ? `https://image.tmdb.org/t/p/w300${it.poster_path}` : '', large: it.poster_path ? `https://image.tmdb.org/t/p/w500${it.poster_path}` : '' },
        tmdb: { media_type: type }
    }));
}

async function fetchTMDbDetails(id, type) {
    const base = 'https://api.themoviedb.org/3';
    const url = `${base}/${type}/${id}?api_key=${encodeURIComponent(tmdbApiKey)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('TMDb details failed');
    const data = await r.json();
    // For TV: number_of_episodes, episode_run_time (array)
    if (type === 'tv') {
        return { episodes: data.number_of_episodes || undefined, duration: Array.isArray(data.episode_run_time) && data.episode_run_time[0] ? data.episode_run_time[0] : undefined };
    }
    // movie: runtime
    if (type === 'movie') {
        return { episodes: undefined, duration: data.runtime || undefined };
    }
    return {};
}

function openAutofill() {
    autofillModal.hidden = false;
    autofillModal.setAttribute('aria-hidden', 'false');
    autofillBackdrop.hidden = false;
    autofillBackdrop.setAttribute('aria-hidden', 'false');
    autofillResults.innerHTML = '';
}

function closeAutofill() {
    autofillModal.hidden = true;
    autofillModal.setAttribute('aria-hidden', 'true');
    autofillBackdrop.hidden = true;
    autofillBackdrop.setAttribute('aria-hidden', 'true');
}

function displayAutofillResults(items) {
    autofillResults.innerHTML = '';
    if (!items || !items.length) {
        autofillResults.textContent = 'No se encontraron resultados';
        return;
    }
    items.forEach(m => {
        const div = document.createElement('div');
        div.className = 'autofill-item';

        const img = document.createElement('img');
        img.className = 'autofill-thumb';
        img.src = m.coverImage?.medium || m.coverImage?.large || '';
        img.alt = m.title?.romaji || m.title?.english || 'portada';

        const meta = document.createElement('div');
        meta.className = 'autofill-meta';
        const h = document.createElement('div');
        h.className = 'autofill-title';
        h.textContent = m.title?.english || m.title?.romaji || m.title?.native || 'Sin título';
        const sub = document.createElement('div');
        sub.className = 'autofill-sub';
        sub.textContent = `${m.format || ''} • ${m.episodes ? m.episodes + ' ep' : '–'} • ${m.duration ? m.duration + ' min/ep' : 'duración desconocida'}`;

        meta.appendChild(h);
        meta.appendChild(sub);

        const actions = document.createElement('div');
        actions.className = 'autofill-actions';
        const useBtn = document.createElement('button');
        useBtn.className = 'autofill-add';
        useBtn.textContent = 'Usar';
        useBtn.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            // if item comes from TMDb, fetch details first
            try {
                if (m.tmdb && m.tmdb.media_type) {
                    const details = await fetchTMDbDetails(m.id, m.tmdb.media_type);
                    m.episodes = details.episodes;
                    m.duration = details.duration;
                }
            } catch (err) {
                console.warn('TMDb details error', err);
            }

            // fill form
            // AniList items put english/romaji in title fields differently; unify
            const titleStr = m.title?.english || m.title?.romaji || m.title?.native || m.title || '';
            document.getElementById('title').value = titleStr;
            document.getElementById('image').value = m.coverImage?.large || m.coverImage?.medium || '';
            // map format to our type choices
            const fmt = (m.format || '').toLowerCase();
            let mapped = 'Serie';
            if (fmt.includes('movie') || m.tmdb?.media_type === 'movie') mapped = 'Película';
            else if (fmt.includes('tv') || fmt.includes('ova') || fmt.includes('ona') || m.tmdb?.media_type === 'tv') mapped = 'Serie';
            else if (fmt.includes('anime')) mapped = 'Anime';
            document.getElementById('type').value = mapped;
            document.getElementById('episodes').value = m.episodes || '';
            document.getElementById('duration').value = m.duration || '';
            // show a toast with estimated hours
            if (m.episodes && m.duration) {
                const hours = (m.episodes * m.duration) / 60;
                showToast(`Estimado: ${hours.toFixed(1)} h (${m.episodes} ep × ${m.duration} min)`, 'success');
            } else if (m.episodes) {
                showToast(`Episodios: ${m.episodes} — duración por episodio desconocida`, 'success');
            } else if (m.duration) {
                showToast(`Duración estimada: ${m.duration} min (película)`,'success');
            }
            closeAutofill();
        });

        actions.appendChild(useBtn);

        div.appendChild(img);
        div.appendChild(meta);
        div.appendChild(actions);
        autofillResults.appendChild(div);
    });
}

// attach filter button handlers
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(b => {
        b.addEventListener('click', () => setFilter(b.getAttribute('data-filter')));
    });

    // wire type select + search field
    const searchInput = document.getElementById('searchInput');
    const typeSelect = document.getElementById('typeFilter');
    if (searchInput) {
        searchInput.value = currentSearch;
        searchInput.addEventListener('input', (ev) => {
            currentSearch = ev.target.value || '';
            localStorage.setItem('mediaList.search', currentSearch);
            // re-render counts & list
            renderList();
        });
    }
    if (typeSelect) {
        typeSelect.value = currentTypeFilter;
        typeSelect.addEventListener('change', (ev) => {
            currentTypeFilter = ev.target.value || 'all';
            localStorage.setItem('mediaList.type', currentTypeFilter);
            renderList();
        });
    }

    // initialize UI based on persisted filter
    setFilter(currentFilter);
    // load saved TMDb key to UI
    if (tmdbKeyInput) tmdbKeyInput.value = tmdbApiKey ? '••••••••' : '';
});

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const image = document.getElementById('image').value.trim();
    const type = document.getElementById('type').value;
    const status = document.getElementById('status').value;

    if (!title) return;

    const episodes = document.getElementById('episodes').value || '';
    const duration = document.getElementById('duration').value || '';

    if (editingId) {
        // update existing
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
            items[idx] = { ...items[idx], title, image, type, status, episodes: episodes ? Number(episodes) : undefined, duration: duration ? Number(duration) : undefined };
        }
        editingId = null;
    } else {
        // add new with stable id
        const id = Date.now().toString();
        items.push({ id, title, image, type, status, episodes: episodes ? Number(episodes) : undefined, duration: duration ? Number(duration) : undefined });
    }

    save();
    renderList();
    addForm.reset();
});

// wire autofill button & modal controls
autofillBtn && autofillBtn.addEventListener('click', async (ev) => {
    const titleVal = document.getElementById('title').value.trim();
    if (!titleVal) {
        alert('Escribe un título para buscar en AniList o pega uno parcial antes de usar Autofill.');
        return;
    }
    // decide which backend to query depending on current 'type' select value
    const typeVal = document.getElementById('type').value;
    openAutofill();
    autofillLoader.hidden = false;
    let results = [];
    try {
        if (typeVal === 'Anime') {
            results = await fetchFromAniList(titleVal);
        } else {
            // Película/Serie: require tmdb key
            if (!tmdbApiKey) {
                closeAutofill();
                alert('Para buscar películas/series reales, primero añade tu TMDb API Key en el panel Herramientas (configuración).');
                return;
            }
            const typeForApi = typeVal === 'Película' ? 'movie' : 'tv';
            results = await fetchFromTMDb(titleVal, typeForApi);
        }
    } catch (err) {
        showToast('Búsqueda fallida: ' + (err.message || err), 'error');
        autofillResults.textContent = 'Error al buscar — mira la consola';
        autofillLoader.hidden = true;
        return;
    }
    autofillLoader.hidden = true;
    displayAutofillResults(results);
});

autofillClose && autofillClose.addEventListener('click', closeAutofill);
autofillBackdrop && autofillBackdrop.addEventListener('click', closeAutofill);

// ESC key closes autofill modal
document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
        if (autofillModal && !autofillModal.hidden) closeAutofill();
    }
});

// wire TMDb key save/clear
saveTmdbKeyBtn && saveTmdbKeyBtn.addEventListener('click', () => {
    const v = tmdbKeyInput && tmdbKeyInput.value.trim();
    if (!v) { showToast('Introduce una clave no vacía', 'error'); return; }
    // allow saving masked placeholder '••••' to keep existing key
    if (v.includes('•')) { showToast('Clave guardada previamente', 'success'); return; }
    tmdbApiKey = v;
    localStorage.setItem('tmdb.apiKey', tmdbApiKey);
    showToast('TMDb API key guardada en localStorage', 'success');
    // display masked
    tmdbKeyInput.value = '••••••••';
});

clearTmdbKeyBtn && clearTmdbKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('tmdb.apiKey');
    tmdbApiKey = '';
    tmdbKeyInput.value = '';
    showToast('TMDb API key borrada', 'success');
});

function startEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('title').value = item.title;
    document.getElementById('image').value = item.image || '';
    document.getElementById('type').value = item.type;
    document.getElementById('status').value = item.status;
    document.getElementById('episodes').value = item.episodes || '';
    document.getElementById('duration').value = item.duration || '';
    editingId = id;
}

function deleteItem(id) {
    // ask for confirmation
    if (!confirm('¿Eliminar este elemento? Esta acción no puede deshacerse.')) return;
    items = items.filter(i => i.id !== id);
    save();
    renderList();
}

// export
function exportJSON() {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediaList.json';
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
            // add id if missing and validate minimal fields
            const normalized = parsed.map(entry => ({
                id: entry.id || Date.now().toString() + Math.random().toString(36).slice(2,7),
                title: String(entry.title || '').slice(0,200),
                image: entry.image || '',
                type: entry.type || 'Serie',
                status: entry.status || 'Pendiente',
                episodes: entry.episodes ? Number(entry.episodes) : undefined,
                duration: entry.duration ? Number(entry.duration) : undefined
            }));

            // Ask whether to replace or merge
            const replace = confirm('¿Quieres reemplazar la lista actual con el archivo importado? (Aceptar = reemplazar, Cancelar = fusionar)');
            if (replace) items = normalized;
            else items = items.concat(normalized);

            save();
            renderList();
            showToast('Importación completada', 'success');
            // close side panel shortly after success
            setTimeout(() => {
                if (!sidePanel.hidden) {
                    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
                    document.dispatchEvent(ev);
                }
            }, 700);
        } catch (err) {
            showToast('Error al importar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// attach listeners
importPanel && importPanel.addEventListener('click', () => {
    if (!importFilePanel.files || !importFilePanel.files[0]) {
        alert('Primero selecciona un archivo JSON usando "Seleccionar archivo".');
        return;
    }
    importJSON(importFilePanel.files[0]);
});
exportPanel && exportPanel.addEventListener('click', exportJSON);

// hidden heart toggle via JS (no inline handlers)
hiddenHeart && hiddenHeart.addEventListener('click', () => {
    const msg = document.getElementById('secretMessage');
    const show = msg.classList.toggle('show');
    hiddenHeart.setAttribute('aria-pressed', String(show));
});

// Side panel (slide-over) behavior
if (menuToggle && sidePanel && backdrop) {
    // helpers to open/close
    const openPanel = () => {
        menuToggle.setAttribute('aria-expanded', 'true');
        sidePanel.hidden = false;
        sidePanel.setAttribute('aria-hidden', 'false');
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
        // animate via classes
        sidePanel.classList.add('open');
        backdrop.classList.add('open');
        // focus first control inside panel
        const first = sidePanel.querySelector('button, [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
    };

    const closePanel = () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        // remove open classes -> after transition hide
        sidePanel.classList.remove('open');
        backdrop.classList.remove('open');
        setTimeout(() => {
            sidePanel.hidden = true;
            sidePanel.setAttribute('aria-hidden', 'true');
            backdrop.hidden = true;
            backdrop.setAttribute('aria-hidden', 'true');
            menuToggle.focus();
        }, 220);
    };

    // Focus trap inside sidePanel for keyboard users
    function trapFocus(e) {
        if (sidePanel.hidden) return;
        const focusables = sidePanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }

    document.addEventListener('keydown', (ev) => {
        if (!sidePanel.hidden) trapFocus(ev);
    });

    // open/close handlers
    menuToggle.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        if (expanded) closePanel(); else openPanel();
    });

    sideClose && sideClose.addEventListener('click', closePanel);
    backdrop && backdrop.addEventListener('click', closePanel);

    // ESC closes when panel is visible
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && !sidePanel.hidden) closePanel();
    });

    // wire custom selector inside panel
    if (chooseFilePanel && importFilePanel && importFileNamePanel) {
        chooseFilePanel.addEventListener('click', () => importFilePanel.click());
        importFilePanel.addEventListener('change', () => {
            const f = importFilePanel.files[0];
            importFileNamePanel.textContent = f ? f.name : 'Ningún archivo seleccionado';
        });
    }
}

// initialize
renderList();

// small toast helper
const toastEl = document.getElementById('toast');
let toastTimeout = null;
function showToast(text, type = 'success', duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
    toastEl.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.className = 'toast';
        toastEl.hidden = true;
    }, duration);
}

// Backwards-compatibility aliases for older HTML (inline handlers / backup files)
// Some older versions used global names like editItem/deleteItem/exportJSON/importJSON.
// Expose those to window so older markup keeps working.
try {
    // prefer the canonical functions we defined
    window.editItem = window.editItem || startEdit;
} catch (e) {}
try {
    window.deleteItem = window.deleteItem || deleteItem;
} catch (e) {}
try {
    window.exportJSON = window.exportJSON || exportJSON;
} catch (e) {}
try {
    window.importJSON = window.importJSON || importJSON;
} catch (e) {}
