const list = document.getElementById('list');
const addForm = document.getElementById('addForm');
let items = JSON.parse(localStorage.getItem('mediaList')) || [];

function renderList() {
    list.innerHTML = '';
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item';

        let emoji = '';
        if (item.type === 'Anime')       emoji = 'JP';
        if (item.type === 'Película')    emoji = 'TV';
        if (item.type === 'Serie')       emoji = 'S';
        if (item.type === 'Mi Vida')       emoji = '<3';

        div.innerHTML = `
            <div class="type-icon">${emoji}</div>
            ${item.image ? `<img src="${item.image}" class="cover" alt="${item.title}"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">` : ''}
            <div class="placeholder" style="display:${item.image?'none':'flex'};">?</div>

            <div class="details">
                <h3>${item.title}</h3>
                <p><strong>${item.type}</strong></p>
                <p class="status ${item.status.toLowerCase().replace(' ', '-')}">Estado: ${item.status}</p>
                <div class="actions">
                    <button onclick="editItem(${index})">Editar</button>
                    <button onclick="deleteItem(${index})">Eliminar</button>
                </div>
            </div>
        `;

        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            div.classList.toggle('open');
        });

        list.appendChild(div);
    });
}

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title  = document.getElementById('title').value.trim();
    const image  = document.getElementById('image').value.trim();
    const type   = document.getElementById('type').value;
    const status = document.getElementById('status').value;

    if (title) {
        items.push({ title, image, type, status });
        localStorage.setItem('mediaList', JSON.stringify(items));
        renderList();
        addForm.reset();
    }
});

window.editItem = function(index) {
    const item = items[index];
    document.getElementById('title').value  = item.title;
    document.getElementById('image').value  = item.image || '';
    document.getElementById('type').value   = item.type;
    document.getElementById('status').value = item.status;
    deleteItem(index);
};

window.deleteItem = function(index) {
    items.splice(index, 1);
    localStorage.setItem('mediaList', JSON.stringify(items));
    renderList();
};

renderList();
