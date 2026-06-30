// --- App State ---
let items = [];
let itemsLastSync = 0;
let isSyncing = false;
let isOnline = navigator.onLine;
let searchQuery = "";
let currentTab = "shopping"; // "shopping" or "catalog"

// Default Configurations
const DEFAULT_CATEGORIES = {
    Ortofrutta: { id: "Ortofrutta", label: "Ortofrutta", icon: "🍎", keywords: ['mela', 'mele', 'banana', 'banane', 'clementine', 'mandar', 'aranc', 'limon', 'pomodor', 'insalata', 'carot', 'patat', 'cipoll', 'aglio', 'verdur', 'frutt', 'fragol', 'pesch', 'zucchine', 'melanzan', 'spinaci', 'basilico', 'insalat', 'pero', 'pere', 'uva', 'ananas', 'kiwi', 'funghi', 'sedano', 'prezzemolo', 'zucca', 'peperon', 'broccoli', 'cavolo'] },
    Gastronomia: { id: "Gastronomia", label: "Salumeria e Gastronomia", icon: "🧀", keywords: ['prosciutto', 'salame', 'mortadella', 'bresaola', 'speck', 'pancetta', 'affettat', 'olive', 'formaggio al banco', 'mozzarella di bufala'] },
    Macelleria: { id: "Macelleria", label: "Macelleria", icon: "🥩", keywords: ['pollo', 'manzo', 'maiale', 'carne', 'petto', 'tacchino', 'bistecca', 'hamburger', 'cotoletta', 'macinato', 'salsiccia', 'fettine', 'arrost'] },
    Pescheria: { id: "Pescheria", label: "Pescheria", icon: "🐟", keywords: ['pesce', 'salmone', 'tonno fresco', 'sgombro', 'merluzzo', 'gamber', 'calamar', 'branzino', 'orata', 'cozze', 'vongole', 'polpo'] },
    Latticini: { id: "Latticini", label: "Latticini e Freschi", icon: "🥛", keywords: ['latte', 'uovo', 'uova', 'formagg', 'mozzarella', 'parmigiano', 'grana', 'yogurt', 'burro', 'panna', 'ricotta', 'gorgonzola', 'pecorino', 'stracchino', 'mascarpone', 'margarina', 'pasta fresca', 'gnocchi', 'tortellini', 'ravioli'] },
    Panetteria: { id: "Panetteria", label: "Panetteria", icon: "🍞", keywords: ['pane', 'focaccia', 'pizza', 'piadina', 'panino', 'grissini', 'taralli', 'baguette'] },
    Dispensa: { id: "Dispensa", label: "Dispensa", icon: "🍝", keywords: ['pasta', 'riso', 'farina', 'sale', 'olio', 'aceto', 'sugo', 'salsa', 'passata', 'pesto', 'tonno in scatola', 'legumi', 'fagioli', 'ceci', 'lenticchie', 'dado', 'maionese', 'ketchup', 'spezie', 'pepe', 'origano', 'lievito', 'pane bauletto', 'crackers'] },
    Colazione: { id: "Colazione", label: "Colazione e Dolci", icon: "☕", keywords: ['zucchero', 'caffe', 'caffè', 'the', 'tè', 'camomilla', 'cereali', 'miele', 'marmellata', 'cioccolato', 'biscott', 'torta', 'brioche', 'croissant', 'fette biscottate', 'merendine', 'nutella', 'cioccolatini', 'caramelle', 'snack', 'patatine'] },
    Bevande: { id: "Bevande", label: "Acqua e Bevande", icon: "🍾", keywords: ['acqua', 'birra', 'vino', 'coca', 'fanta', 'sprite', 'succo', 'cola', 'bevanda', 'aranciata', 'tassoni', 'gassosa', 'red bull', 'prosecco', 'spumante', 'tonic', 'aperol'] },
    Surgelati: { id: "Surgelati", label: "Surgelati", icon: "❄️", keywords: ['gelato', 'surgelat', 'piselli surgelati', 'pizza surgelata', 'bastoncini', 'patatine fritte', 'congelat', 'sorbetto', 'sofficini', 'spinaci surgelati'] },
    Igiene: { id: "Igiene", label: "Igiene Persona", icon: "🧴", keywords: ['sapone', 'shampoo', 'bagnoschiuma', 'dentifricio', 'spazzolino', 'deodorante', 'assorbenti', 'rasoio', 'schiuma da barba', 'crema', 'balsamo', 'carta igienica', 'fazzoletti'] },
    Casa: { id: "Casa", label: "Cura della Casa", icon: "🧼", keywords: ['scottex', 'detersivo', 'candeggina', 'sgrassatore', 'sacchetti', 'ammorbidente', 'piatti', 'lavatrice', 'spugna', 'panni', 'alluminio', 'pellicola', 'carta forno', 'lavastoviglie', 'pavimenti', 'vetri'] },
    Animali: { id: "Animali", label: "Animali", icon: "🐾", keywords: ['croccantini', 'scatolette', 'cane', 'cani', 'gatto', 'gatti', 'lettiera', 'cibo animali'] },
    Uncategorized: { id: "Uncategorized", label: "Altro", icon: "❓", keywords: [] }
};
const DEFAULT_ORDER = Object.keys(DEFAULT_CATEGORIES);

let appSettings = {
    supermarkets: {
        "default": { id: "default", name: "Supermercato Principale", order: [...DEFAULT_ORDER] }
    },
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
};
let settingsLastSync = 0;
let activeSupermarketId = "default";
let tempCategoryOrder = [];
let editingSupermarketId = null;

// --- DOM Elements ---
// Status
const connectionBadge = document.getElementById('connection-badge');
const syncBadge = document.getElementById('sync-badge');
const offlineBanner = document.getElementById('offline-banner');
const syncButton = document.getElementById('sync-button');
const settingsButton = document.getElementById('settings-button');
const supermarketSelect = document.getElementById('active-supermarket-select');

// Inputs & Forms
const searchInput = document.getElementById('search-input');
const addItemForm = document.getElementById('add-item-form');
const itemNameInput = document.getElementById('item-name');
const itemQtyInput = document.getElementById('item-qty');
const itemCategorySelect = document.getElementById('item-category');

// Lists & States
const listViewContainer = document.getElementById('grocery-list-view');
const emptyShoppingState = document.getElementById('empty-shopping');
const emptyCatalogState = document.getElementById('empty-catalog');

// Edit Modal
const editModal = document.getElementById('edit-modal');
const editItemForm = document.getElementById('edit-item-form');
const editItemCategorySelect = document.getElementById('edit-item-category');

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const supermarketsList = document.getElementById('supermarkets-list');
const categoriesList = document.getElementById('categories-list');
const reorderSection = document.getElementById('supermarket-reorder-section');
const reorderList = document.getElementById('reorder-list');

// Edit Category Modal
const editCategoryModal = document.getElementById('edit-category-modal');
const editCategoryForm = document.getElementById('edit-category-form');


// --- Initialization ---
function init() {
    loadLocalData();
    populateSelects();
    renderUI();
    
    // Initial sync
    if (isOnline) {
        syncAll(false);
    }
}

// --- Data Management (Local Storage) ---
function loadLocalData() {
    // Items
    const savedItems = localStorage.getItem('groceries_items');
    items = savedItems ? JSON.parse(savedItems) : [];
    itemsLastSync = parseFloat(localStorage.getItem('groceries_last_sync') || '0');
    
    // Settings
    const savedSup = localStorage.getItem('app_supermarkets');
    if (savedSup) appSettings.supermarkets = JSON.parse(savedSup);
    
    const savedCat = localStorage.getItem('app_categories');
    if (savedCat) {
        const parsed = JSON.parse(savedCat);
        // Merge missing keywords from defaults (migration path)
        for (const key in parsed) {
            if (!parsed[key].keywords && DEFAULT_CATEGORIES[key]) {
                parsed[key].keywords = [...(DEFAULT_CATEGORIES[key].keywords || [])];
            } else if (!parsed[key].keywords) {
                parsed[key].keywords = [];
            }
        }
        appSettings.categories = parsed;
    }
    
    settingsLastSync = parseFloat(localStorage.getItem('settings_last_sync') || '0');
    
    // Active View State
    activeSupermarketId = localStorage.getItem('active_supermarket') || 'default';
    if (!appSettings.supermarkets[activeSupermarketId]) {
        activeSupermarketId = Object.keys(appSettings.supermarkets)[0] || 'default';
    }
}

function saveItemsLocally() {
    localStorage.setItem('groceries_items', JSON.stringify(items));
}

function saveSettingsLocally(triggerSync = true) {
    localStorage.setItem('app_supermarkets', JSON.stringify(appSettings.supermarkets));
    localStorage.setItem('app_categories', JSON.stringify(appSettings.categories));
    
    populateSelects();
    renderUI();
    if (triggerSync && isOnline) syncSettings();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}


// --- UI Rendering ---

function populateSelects() {
    // Supermarket Select in Action Bar
    supermarketSelect.innerHTML = '';
    for (const [id, sup] of Object.entries(appSettings.supermarkets)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = sup.name;
        if (id === activeSupermarketId) opt.selected = true;
        supermarketSelect.appendChild(opt);
    }

    // Category Selects
    const catsHTML = Object.values(appSettings.categories)
        .map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`)
        .join('');
    
    itemCategorySelect.innerHTML = catsHTML;
    editItemCategorySelect.innerHTML = catsHTML;
    
    // Ensure "Uncategorized" is selected by default if available for new items
    if (appSettings.categories["Uncategorized"]) {
        itemCategorySelect.value = "Uncategorized";
    }
}

function getOptimizedCategoryOrder(sup) {
    if (!sup.graph || !sup.graph.nodes['entrance'] || !sup.graph.nodes['checkout']) return sup.order;
    
    const graph = sup.graph;
    const requiredCats = new Set();
    
    // Determine which categories have items needed
    items.filter(i => !i.deleted && i.needed === 1).forEach(i => requiredCats.add(i.category));
    
    // Which of these are actually placed on the map?
    const placedRequiredCats = Array.from(requiredCats).filter(c => graph.nodes[c]);
    
    if (placedRequiredCats.length === 0) return sup.order;
    
    const nodes = Object.keys(graph.nodes);
    const dist = {};
    nodes.forEach(u => {
        dist[u] = {};
        nodes.forEach(v => dist[u][v] = (u === v ? 0 : Infinity));
    });
    
    graph.edges.forEach(e => {
        const n1 = graph.nodes[e.u];
        const n2 = graph.nodes[e.v];
        if(!n1 || !n2) return;
        
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const df = Math.abs(n1.floor - n2.floor);
        const weight = Math.sqrt(dx*dx + dy*dy) + df * 1000;
        
        dist[e.u][e.v] = Math.min(dist[e.u][e.v] || Infinity, weight);
        dist[e.v][e.u] = dist[e.u][e.v];
    });
    
    // Floyd-Warshall
    nodes.forEach(k => {
        nodes.forEach(i => {
            nodes.forEach(j => {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            });
        });
    });
    
    // Nearest neighbor TSP starting from entrance
    let current = 'entrance';
    const unvisited = new Set(placedRequiredCats);
    const orderedCats = [];
    
    while(unvisited.size > 0) {
        let bestDist = Infinity;
        let bestNext = null;
        for (const nxt of unvisited) {
            if (dist[current][nxt] < bestDist) {
                bestDist = dist[current][nxt];
                bestNext = nxt;
            }
        }
        if (bestNext === null || bestDist === Infinity) {
            unvisited.forEach(u => orderedCats.push(u));
            break;
        }
        orderedCats.push(bestNext);
        unvisited.delete(bestNext);
        current = bestNext;
    }
    
    // Append any unplaced categories at the end
    const allCats = Object.keys(appSettings.categories);
    const unplaced = allCats.filter(c => !orderedCats.includes(c));
    
    return [...orderedCats, ...unplaced];
}

function renderUI() {
    // Determine which items to show
    let filteredItems = items.filter(item => !item.deleted);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(q));
    } else {
        if (currentTab === 'shopping') {
            filteredItems = filteredItems.filter(item => item.needed === 1);
        }
    }
    
    // Tab Badges
    document.getElementById('shopping-tab-badge').textContent = items.filter(i => !i.deleted && i.needed === 1).length;
    document.getElementById('catalog-tab-badge').textContent = items.filter(i => !i.deleted).length;
    
    // Empty states
    listViewContainer.innerHTML = '';
    emptyShoppingState.classList.add('hidden');
    emptyCatalogState.classList.add('hidden');
    
    if (filteredItems.length === 0 && !searchQuery) {
        if (currentTab === 'shopping') emptyShoppingState.classList.remove('hidden');
        else emptyCatalogState.classList.remove('hidden');
        return;
    }

    // Group items by category
    const groups = {};
    for (const cat of Object.keys(appSettings.categories)) { groups[cat] = []; }
    groups['Uncategorized'] = []; // fallback
    
    filteredItems.forEach(item => {
        if (groups[item.category]) groups[item.category].push(item);
        else groups['Uncategorized'].push(item);
    });

    // Get active supermarket order
    const activeSup = appSettings.supermarkets[activeSupermarketId];
    let order = activeSup ? activeSup.order : DEFAULT_ORDER;
    
    if (currentTab === 'shopping' && activeSup && activeSup.graph) {
        order = getOptimizedCategoryOrder(activeSup);
    } else {
        // Append any categories that exist but aren't in the supermarket's order array
        const allCatKeys = Object.keys(appSettings.categories);
        const missingKeys = allCatKeys.filter(k => !order.includes(k));
        order = [...order, ...missingKeys];
    }

    // Render cards
    order.forEach(catId => {
        const catItems = groups[catId];
        if (!catItems || catItems.length === 0) return;
        
        const meta = appSettings.categories[catId] || { icon: "❓", label: catId };
        
        const card = document.createElement('div');
        card.className = 'category-card';
        
        card.innerHTML = `
            <div class="category-card-header">
                <span class="category-card-title">${meta.icon} ${meta.label}</span>
                <span class="category-card-count">${catItems.length}</span>
            </div>
            <div class="category-items-list">
                ${catItems.map(item => `
                    <div class="item-row ${item.needed ? 'needed' : 'not-needed'}" data-id="${item.id}">
                        <div class="item-left" onclick="toggleItemNeeded('${item.id}')">
                            <div class="checkbox-custom">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <div class="item-details">
                                <span class="item-name">${item.name}</span>
                                ${item.quantity ? `<span class="qty-pill">${item.quantity}</span>` : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-edit" onclick="openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-delete" onclick="deleteItem('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        listViewContainer.appendChild(card);
    });
}


// --- Item Operations ---

// Smart Auto-Category selection on typing name
itemNameInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase().trim();
    if (text.length < 3) return;
    
    // Prioritize modifier categories (e.g. Frozen, Pets, Beverages) first
    const modifiers = ['Surgelati', 'Animali', 'Bevande', 'Igiene', 'Casa'];
    const otherCats = Object.keys(appSettings.categories).filter(k => !modifiers.includes(k));
    const priorityOrder = [...modifiers, ...otherCats];
    
    for (const catId of priorityOrder) {
        const catMeta = appSettings.categories[catId];
        if (!catMeta || !catMeta.keywords) continue;
        for (const kw of catMeta.keywords) {
            if (text.includes(kw.toLowerCase())) {
                itemCategorySelect.value = catId;
                return;
            }
        }
    }
});

addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newItem = {
        id: generateId(),
        name: document.getElementById('item-name').value.trim(),
        quantity: document.getElementById('item-qty').value.trim(),
        category: itemCategorySelect.value,
        needed: currentTab === 'shopping' ? 1 : 0,
        deleted: 0,
        updated_at: Date.now()
    };
    items.push(newItem);
    saveItemsLocally();
    renderUI();
    addItemForm.reset();
    if (appSettings.categories["Uncategorized"]) itemCategorySelect.value = "Uncategorized";
    if (isOnline) syncItems();
});

window.toggleItemNeeded = function(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.needed = item.needed ? 0 : 1;
        item.updated_at = Date.now();
        saveItemsLocally();
        renderUI();
        if (isOnline) syncItems();
    }
};

window.deleteItem = function(id) {
    if (confirm('Sei sicuro di voler eliminare questo articolo dal catalogo?')) {
        const item = items.find(i => i.id === id);
        if (item) {
            item.deleted = 1;
            item.updated_at = Date.now();
            saveItemsLocally();
            renderUI();
            if (isOnline) syncItems();
        }
    }
};

window.openEditModal = function(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-qty').value = item.quantity;
        document.getElementById('edit-item-category').value = item.category;
        editModal.classList.remove('hidden');
    }
};

editItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-item-id').value;
    const item = items.find(i => i.id === id);
    if (item) {
        item.name = document.getElementById('edit-item-name').value.trim();
        item.quantity = document.getElementById('edit-item-qty').value.trim();
        item.category = document.getElementById('edit-item-category').value;
        item.updated_at = Date.now();
        saveItemsLocally();
        renderUI();
        editModal.classList.add('hidden');
        if (isOnline) syncItems();
    }
});


// --- Settings Dashboard Operations ---
settingsButton.addEventListener('click', () => {
    renderSettingsLists();
    settingsModal.classList.remove('hidden');
});

document.getElementById('close-settings-modal').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.add('hidden'));
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.remove('hidden');
        document.getElementById('supermarket-reorder-section').classList.add('hidden'); // hide reorder when switching tabs
    });
});

function renderSettingsLists() {
    // Supermarkets
    supermarketsList.innerHTML = '';
    for (const [id, sup] of Object.entries(appSettings.supermarkets)) {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `
            <div class="settings-item-title"><i class="fa-solid fa-shop"></i> ${sup.name}</div>
            <div class="item-actions" style="opacity: 1;">
                <button title="Mappa" onclick="openStoreMap('${id}')"><i class="fa-solid fa-map"></i></button>
                <button title="Ordina Corsie" onclick="openReorder('${id}')"><i class="fa-solid fa-arrow-down-a-z"></i></button>
                ${Object.keys(appSettings.supermarkets).length > 1 ? `<button class="btn-delete" onclick="deleteSupermarket('${id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        supermarketsList.appendChild(div);
    }
    
    // Categories
    categoriesList.innerHTML = '';
    for (const [id, cat] of Object.entries(appSettings.categories)) {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `
            <div class="settings-item-title">${cat.icon} ${cat.label}</div>
            <div class="item-actions" style="opacity: 1;">
                <button class="btn-edit" onclick="openEditCategory('${id}')" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteCategory('${id}')" title="Elimina"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        categoriesList.appendChild(div);
    }
}

// Add Supermarket
document.getElementById('add-supermarket-btn').addEventListener('click', () => {
    const input = document.getElementById('new-supermarket-name');
    const name = input.value.trim();
    if (name) {
        const id = 'sup_' + generateId();
        appSettings.supermarkets[id] = {
            id: id,
            name: name,
            order: Object.keys(appSettings.categories)
        };
        saveSettingsLocally();
        renderSettingsLists();
        input.value = '';
    }
});

// Add Category
document.getElementById('add-category-btn').addEventListener('click', () => {
    const iconInput = document.getElementById('new-category-icon');
    const nameInput = document.getElementById('new-category-name');
    const icon = iconInput.value.trim() || '❓';
    const name = nameInput.value.trim();
    if (name) {
        const id = 'cat_' + generateId();
        appSettings.categories[id] = { id: id, label: name, icon: icon, keywords: [] };
        // Add to all supermarkets' orders at the end
        for (const supId in appSettings.supermarkets) {
            appSettings.supermarkets[supId].order.push(id);
        }
        saveSettingsLocally();
        renderSettingsLists();
        iconInput.value = '';
        nameInput.value = '';
    }
});

window.openEditCategory = function(id) {
    const cat = appSettings.categories[id];
    if (cat) {
        document.getElementById('edit-cat-id').value = id;
        document.getElementById('edit-cat-icon').value = cat.icon || '';
        document.getElementById('edit-cat-name').value = cat.label || '';
        document.getElementById('edit-cat-keywords').value = (cat.keywords || []).join(', ');
        editCategoryModal.classList.remove('hidden');
    }
}

document.getElementById('close-edit-cat-modal').addEventListener('click', () => editCategoryModal.classList.add('hidden'));
document.getElementById('cancel-edit-cat').addEventListener('click', () => editCategoryModal.classList.add('hidden'));

editCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-cat-id').value;
    if (appSettings.categories[id]) {
        appSettings.categories[id].icon = document.getElementById('edit-cat-icon').value.trim() || '❓';
        appSettings.categories[id].label = document.getElementById('edit-cat-name').value.trim() || appSettings.categories[id].label;
        
        const kwString = document.getElementById('edit-cat-keywords').value;
        appSettings.categories[id].keywords = kwString.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        
        saveSettingsLocally();
        renderSettingsLists();
        editCategoryModal.classList.add('hidden');
    }
});

window.deleteSupermarket = function(id) {
    if(confirm('Eliminare questo supermercato?')) {
        delete appSettings.supermarkets[id];
        if (activeSupermarketId === id) {
            activeSupermarketId = Object.keys(appSettings.supermarkets)[0];
            localStorage.setItem('active_supermarket', activeSupermarketId);
        }
        saveSettingsLocally();
        renderSettingsLists();
        reorderSection.classList.add('hidden');
    }
}

window.deleteCategory = function(id) {
    if(confirm('Attenzione: eliminando la categoria, gli articoli non verranno persi ma andranno in "Altro". Procedere?')) {
        delete appSettings.categories[id];
        for (const supId in appSettings.supermarkets) {
            appSettings.supermarkets[supId].order = appSettings.supermarkets[supId].order.filter(c => c !== id);
        }
        saveSettingsLocally();
        renderSettingsLists();
    }
}

// Reorder Logic
window.openReorder = function(supId) {
    editingSupermarketId = supId;
    const sup = appSettings.supermarkets[supId];
    
    // Ensure all current categories exist in the order array
    let order = sup.order;
    const allCatKeys = Object.keys(appSettings.categories);
    const missingKeys = allCatKeys.filter(k => !order.includes(k));
    tempCategoryOrder = [...order.filter(k => appSettings.categories[k]), ...missingKeys];
    
    document.getElementById('reorder-supermarket-title').textContent = `Ordina: ${sup.name}`;
    renderReorderListUI();
    reorderSection.classList.remove('hidden');
}

document.getElementById('close-reorder-section').addEventListener('click', () => {
    reorderSection.classList.add('hidden');
});

function renderReorderListUI() {
    reorderList.innerHTML = '';
    tempCategoryOrder.forEach((catId, index) => {
        const cat = appSettings.categories[catId];
        if(!cat) return;
        const div = document.createElement('div');
        div.className = 'reorder-item';
        div.innerHTML = `
            <span>${cat.icon} ${cat.label}</span>
            <div class="reorder-controls">
                <button ${index === 0 ? 'disabled' : ''} onclick="moveCat(${index}, -1)"><i class="fa-solid fa-arrow-up"></i></button>
                <button ${index === tempCategoryOrder.length - 1 ? 'disabled' : ''} onclick="moveCat(${index}, 1)"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
        `;
        reorderList.appendChild(div);
    });
}

window.moveCat = function(index, dir) {
    if (index + dir < 0 || index + dir >= tempCategoryOrder.length) return;
    const temp = tempCategoryOrder[index];
    tempCategoryOrder[index] = tempCategoryOrder[index + dir];
    tempCategoryOrder[index + dir] = temp;
    renderReorderListUI();
}

document.getElementById('save-reorder-btn').addEventListener('click', () => {
    if (editingSupermarketId && appSettings.supermarkets[editingSupermarketId]) {
        appSettings.supermarkets[editingSupermarketId].order = [...tempCategoryOrder];
        saveSettingsLocally();
        reorderSection.classList.add('hidden');
    }
});

supermarketSelect.addEventListener('change', (e) => {
    activeSupermarketId = e.target.value;
    localStorage.setItem('active_supermarket', activeSupermarketId);
    renderUI();
});

// --- Synchronization (Dual Sync) ---

function syncAll(force = false) {
    if (!isOnline) return;
    isSyncing = true;
    updateSyncUI();
    
    Promise.all([syncSettingsRequest(), syncItemsRequest()])
        .then(() => {
            isSyncing = false;
            updateSyncUI();
            renderUI();
        })
        .catch(err => {
            console.error('Sync Error:', err);
            isSyncing = false;
            updateSyncUI();
        });
}

function syncItems() {
    if(!isOnline) return;
    isSyncing = true; updateSyncUI();
    syncItemsRequest().finally(() => { isSyncing = false; updateSyncUI(); renderUI(); });
}

function syncSettings() {
    if(!isOnline) return;
    isSyncing = true; updateSyncUI();
    syncSettingsRequest().finally(() => { isSyncing = false; updateSyncUI(); renderUI(); populateSelects(); });
}

async function syncItemsRequest() {
    const unconfirmedItems = items.filter(item => item.updated_at > itemsLastSync);
    
    const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            client_last_sync: itemsLastSync,
            changes: unconfirmedItems
        })
    });
    
    if(!res.ok) throw new Error('Sync failed');
    const data = await res.json();
    
    // Merge updates
    data.updates.forEach(serverItem => {
        const localIndex = items.findIndex(i => i.id === serverItem.id);
        if (localIndex > -1) {
            if (serverItem.updated_at > items[localIndex].updated_at) {
                items[localIndex] = serverItem;
            }
        } else {
            items.push(serverItem);
        }
    });
    
    items = items.filter(item => !(item.deleted && item.updated_at <= data.server_time));
    itemsLastSync = data.server_time;
    localStorage.setItem('groceries_last_sync', itemsLastSync.toString());
    saveItemsLocally();
}

async function syncSettingsRequest() {
    const changes = [
        { key: "supermarkets", value: JSON.stringify(appSettings.supermarkets), updated_at: Date.now() },
        { key: "categories", value: JSON.stringify(appSettings.categories), updated_at: Date.now() }
    ];
    
    const res = await fetch('/api/sync_settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            client_last_sync: settingsLastSync,
            changes: changes
        })
    });
    
    if(!res.ok) throw new Error('Settings sync failed');
    const data = await res.json();
    
    data.updates.forEach(update => {
        if (update.key === 'supermarkets') appSettings.supermarkets = JSON.parse(update.value);
        if (update.key === 'categories') appSettings.categories = JSON.parse(update.value);
    });
    
    settingsLastSync = data.server_time;
    localStorage.setItem('settings_last_sync', settingsLastSync.toString());
    saveSettingsLocally(false); // don't trigger sync loop
}

function updateSyncUI() {
    if (isSyncing) {
        syncBadge.className = 'badge syncing';
        syncBadge.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span class="badge-text">Sincronizzazione...</span>';
        syncButton.classList.add('spinning');
    } else {
        syncBadge.className = 'badge synced';
        syncBadge.innerHTML = '<i class="fa-solid fa-check"></i><span class="badge-text">Sincronizzato</span>';
        syncButton.classList.remove('spinning');
    }
}

// Network events
window.addEventListener('online', () => { isOnline = true; offlineBanner.classList.add('hidden'); connectionBadge.className = 'badge online'; connectionBadge.innerHTML = '<i class="fa-solid fa-wifi"></i><span class="badge-text">Online</span>'; syncAll(); });
window.addEventListener('offline', () => { isOnline = false; offlineBanner.classList.remove('hidden'); connectionBadge.className = 'badge offline'; connectionBadge.innerHTML = '<i class="fa-solid fa-wifi-slash"></i><span class="badge-text">Offline</span>'; });

// Navigation
document.getElementById('tab-shopping').addEventListener('click', (e) => { currentTab = 'shopping'; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); renderUI(); });
document.getElementById('tab-catalog').addEventListener('click', (e) => { currentTab = 'catalog'; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); renderUI(); });
searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.trim(); renderUI(); });
document.getElementById('close-modal').addEventListener('click', () => { editModal.classList.add('hidden'); });
document.getElementById('cancel-edit').addEventListener('click', () => { editModal.classList.add('hidden'); });
syncButton.addEventListener('click', () => { syncAll(true); });

// Boot
init();
