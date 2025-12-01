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

// Use items with stable ids to support editing in-place
let items = JSON.parse(localStorage.getItem('mediaList')) || [];
let editingId = null;

// Helper to persist
function save() {
    localStorage.setItem('mediaList', JSON.stringify(items));
}

function renderList() {
    list.innerHTML = '';
    items.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'item';
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
}

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const image = document.getElementById('image').value.trim();
    const type = document.getElementById('type').value;
    const status = document.getElementById('status').value;

    if (!title) return;

    if (editingId) {
        // update existing
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
            items[idx] = { ...items[idx], title, image, type, status };
        }
        editingId = null;
    } else {
        // add new with stable id
        const id = Date.now().toString();
        items.push({ id, title, image, type, status });
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
                status: entry.status || 'Pendiente'
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
