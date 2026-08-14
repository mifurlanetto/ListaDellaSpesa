// --- App State ---
let items = [];
let itemsLastSync = 0;
let isSyncing = false;
let isOnline = navigator.onLine;
let searchQuery = "";
let currentTab = "shopping"; // "shopping" or "catalog"
let lastSyncTime = Date.now();

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
let supermarketsLastUpdated = 0;
let categoriesLastUpdated = 0;
let activeSupermarketId = "default";
let tempCategoryOrder = [];
let editingSupermarketId = null;

// --- DOM Elements ---
// Status
const connectionBadge = document.getElementById('connection-badge');
const syncBadge = document.getElementById('sync-badge');
const syncText = document.getElementById('sync-text');
const offlineBanner = document.getElementById('offline-banner');
const settingsButton = document.getElementById('settings-button');
const supermarketSelect = document.getElementById('active-supermarket-select');
const supermarketSelectorContainer = document.getElementById('supermarket-selector-container');

// Inputs & Forms
const searchInput = document.getElementById('search-input');
const quickAddBtn = document.getElementById('quick-add-btn');

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
    lastSyncTime = parseFloat(localStorage.getItem('groceries_last_sync') || Date.now().toString());
    
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
    supermarketsLastUpdated = parseFloat(localStorage.getItem('supermarkets_updated_at') || '0');
    categoriesLastUpdated = parseFloat(localStorage.getItem('categories_updated_at') || '0');
    
    // Active View State
    activeSupermarketId = localStorage.getItem('active_supermarket') || 'default';
    if (!appSettings.supermarkets[activeSupermarketId]) {
        activeSupermarketId = Object.keys(appSettings.supermarkets)[0] || 'default';
    }
}

function saveItemsLocally() {
    localStorage.setItem('groceries_items', JSON.stringify(items));
}

function saveSettingsLocally(triggerSync = true, updatedSupermarkets = true, updatedCategories = true) {
    if (updatedSupermarkets) {
        supermarketsLastUpdated = Date.now();
        localStorage.setItem('supermarkets_updated_at', supermarketsLastUpdated.toString());
    }
    if (updatedCategories) {
        categoriesLastUpdated = Date.now();
        localStorage.setItem('categories_updated_at', categoriesLastUpdated.toString());
    }
    
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
    
    editItemCategorySelect.innerHTML = catsHTML;
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
    
    // Append any unplaced categories at the end, maintaining the supermarket's custom order
    const unplaced = sup.order.filter(c => !orderedCats.includes(c));
    
    return [...orderedCats, ...unplaced];
}

function renderUI() {
    // Show/Hide Supermarket Selector based on current tab
    if (supermarketSelectorContainer) {
        supermarketSelectorContainer.style.display = currentTab === 'shopping' ? 'flex' : 'none';
    }

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

function getAutoCategory(text) {
    const textClean = text.toLowerCase().trim();
    if (textClean.length < 3) return "Uncategorized";
    
    // Prioritize modifier categories (e.g. Frozen, Pets, Beverages) first
    const modifiers = ['Surgelati', 'Animali', 'Bevande', 'Igiene', 'Casa'];
    const otherCats = Object.keys(appSettings.categories).filter(k => !modifiers.includes(k));
    const priorityOrder = [...modifiers, ...otherCats];
    
    for (const catId of priorityOrder) {
        const catMeta = appSettings.categories[catId];
        if (!catMeta || !catMeta.keywords) continue;
        for (const kw of catMeta.keywords) {
            if (textClean.includes(kw.toLowerCase())) {
                return catId;
            }
        }
    }
    return "Uncategorized";
}

function handleSearchSubmit() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    // Search if it already exists (case-insensitive)
    const existingItem = items.find(i => i.name.toLowerCase() === query.toLowerCase());
    if (existingItem) {
        existingItem.needed = 1;
        existingItem.deleted = 0;
        existingItem.updated_at = Date.now();
    } else {
        const newItem = {
            id: generateId(),
            name: query,
            quantity: "",
            category: getAutoCategory(query),
            needed: 1, // Added from quick bar means we want it
            deleted: 0,
            updated_at: Date.now()
        };
        items.push(newItem);
    }
    
    saveItemsLocally();
    renderUI();
    searchInput.value = '';
    searchQuery = '';
    if (isOnline) syncItems();
}

editItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value.trim();
    const qty = document.getElementById('edit-item-qty').value.trim();
    const category = document.getElementById('edit-item-category').value;
    
    if (id) {
        // Editing existing item
        const item = items.find(i => i.id === id);
        if (item) {
            item.name = name;
            item.quantity = qty;
            item.category = category;
            item.updated_at = Date.now();
        }
    } else {
        // Creating new item
        const newItem = {
            id: generateId(),
            name: name,
            quantity: qty,
            category: category,
            needed: 1,
            deleted: 0,
            updated_at: Date.now()
        };
        items.push(newItem);
        searchInput.value = '';
        searchQuery = '';
    }
    
    saveItemsLocally();
    renderUI();
    editModal.classList.add('hidden');
    if (isOnline) syncItems();
});

// Search listeners
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderUI();
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
        document.getElementById('edit-modal-title').textContent = "Modifica Articolo";
        editModal.classList.remove('hidden');
    }
};


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
        saveSettingsLocally(true, true, false);
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
            const sup = appSettings.supermarkets[supId];
            sup.order.push(id);
            if (sup.graph) {
                // Automatically place it in the center of the graph
                sup.graph.nodes[id] = {
                    x: 200,
                    y: 250,
                    floor: 0,
                    type: 'category',
                    label: name,
                    icon: icon
                };
            }
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
        
        saveSettingsLocally(true, false, true);
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
        saveSettingsLocally(true, true, false);
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
        saveSettingsLocally(true, true, false);
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
        .then(([settingsStats, itemsStats]) => {
            isSyncing = false;
            updateSyncUI();
            renderUI();
            processSyncStats(itemsStats, settingsStats);
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
    syncItemsRequest().then(stats => {
        processSyncStats(stats, null);
    }).finally(() => { isSyncing = false; updateSyncUI(); renderUI(); });
}

function syncSettings() {
    if(!isOnline) return;
    isSyncing = true; updateSyncUI();
    syncSettingsRequest().then(stats => {
        processSyncStats(null, stats);
    }).finally(() => { isSyncing = false; updateSyncUI(); renderUI(); populateSelects(); });
}

function processSyncStats(itemsStats, settingsStats) {
    let msgs = [];
    if (itemsStats) {
        if (itemsStats.itemsAdded > 0) msgs.push(`+${itemsStats.itemsAdded} da prendere`);
        if (itemsStats.itemsRemoved > 0) msgs.push(`-${itemsStats.itemsRemoved} rimosse`);
    }
    if (settingsStats && settingsStats.mapUpdates.length > 0) {
        msgs.push(`Nuova mappa: ${settingsStats.mapUpdates.join(', ')}`);
    }
    if (msgs.length > 0) {
        showToast(msgs.join(' | '));
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast card';
    toast.style.backgroundColor = 'var(--primary-color)';
    toast.style.color = '#fff';
    toast.style.padding = '1rem';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    void toast.offsetWidth; // trigger reflow
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
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
    
    if (res.status === 401) { window.location.href = '/login'; return; }
    if(!res.ok) throw new Error('Sync failed');
    const data = await res.json();
    
    let stats = { itemsAdded: 0, itemsRemoved: 0 };
    
    // Merge updates
    data.updates.forEach(serverItem => {
        const localIndex = items.findIndex(i => i.id === serverItem.id);
        if (localIndex > -1) {
            if (serverItem.updated_at > items[localIndex].updated_at) {
                const oldItem = items[localIndex];
                const wasNeeded = oldItem.needed === 1 && oldItem.deleted === 0;
                const isNeeded = serverItem.needed === 1 && serverItem.deleted === 0;
                if (isNeeded && !wasNeeded) stats.itemsAdded++;
                else if (!isNeeded && wasNeeded) stats.itemsRemoved++;
                
                items[localIndex] = serverItem;
            }
        } else {
            if (serverItem.needed === 1 && serverItem.deleted === 0) stats.itemsAdded++;
            items.push(serverItem);
        }
    });
    
    items = items.filter(item => !(item.deleted && item.updated_at <= data.server_time));
    itemsLastSync = data.server_time;
    lastSyncTime = Date.now();
    localStorage.setItem('groceries_last_sync', itemsLastSync.toString());
    saveItemsLocally();
    updateSyncUI();
    
    return stats;
}

async function syncSettingsRequest() {
    const changes = [];
    if (supermarketsLastUpdated > settingsLastSync) {
        changes.push({ key: "supermarkets", value: JSON.stringify(appSettings.supermarkets), updated_at: supermarketsLastUpdated });
    }
    if (categoriesLastUpdated > settingsLastSync) {
        changes.push({ key: "categories", value: JSON.stringify(appSettings.categories), updated_at: categoriesLastUpdated });
    }
    
    const res = await fetch('/api/sync_settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            client_last_sync: settingsLastSync,
            changes: changes
        })
    });
    
    if (res.status === 401) { window.location.href = '/login'; return; }
    if(!res.ok) throw new Error('Settings sync failed');
    const data = await res.json();
    
    let stats = { mapUpdates: [] };
    
    data.updates.forEach(update => {
        if (update.key === 'supermarkets') {
            const newSupermarkets = JSON.parse(update.value);
            for (const id in newSupermarkets) {
                const isNewMap = !appSettings.supermarkets[id] && newSupermarkets[id].graph;
                const isUpdatedMap = appSettings.supermarkets[id] && JSON.stringify(appSettings.supermarkets[id].graph) !== JSON.stringify(newSupermarkets[id].graph);
                if (isNewMap || isUpdatedMap) {
                    stats.mapUpdates.push(newSupermarkets[id].name);
                }
            }
            appSettings.supermarkets = newSupermarkets;
            supermarketsLastUpdated = update.updated_at;
            localStorage.setItem('supermarkets_updated_at', supermarketsLastUpdated.toString());
        }
        if (update.key === 'categories') {
            appSettings.categories = JSON.parse(update.value);
            categoriesLastUpdated = update.updated_at;
            localStorage.setItem('categories_updated_at', categoriesLastUpdated.toString());
        }
    });
    
    settingsLastSync = data.server_time;
    lastSyncTime = Date.now();
    localStorage.setItem('settings_last_sync', settingsLastSync.toString());
    saveSettingsLocally(false, false, false); // don't trigger sync loop and don't update timestamps
    updateSyncUI();
    
    return stats;
}

function updateSyncUI() {
    if (!syncText) return;
    if (isSyncing) {
        syncBadge.className = 'badge syncing';
        syncText.textContent = 'Sincronizzazione...';
    } else if (!isOnline) {
        syncBadge.className = 'badge offline';
        syncText.textContent = 'Offline';
    } else {
        syncBadge.className = 'badge synced';
        const diffSec = Math.floor((Date.now() - lastSyncTime) / 1000);
        if (diffSec < 10) {
            syncText.textContent = 'Sincronizzato (ora)';
        } else if (diffSec < 60) {
            syncText.textContent = `Sincronizzato (${diffSec}s fa)`;
        } else {
            const diffMin = Math.floor(diffSec / 60);
            syncText.textContent = `Sincronizzato (${diffMin}m fa)`;
        }
    }
}

// Network events
window.addEventListener('online', () => { isOnline = true; offlineBanner.classList.add('hidden'); connectionBadge.className = 'badge online'; connectionBadge.innerHTML = '<i class="fa-solid fa-wifi"></i><span class="badge-text">Online</span>'; syncAll(); });
window.addEventListener('offline', () => { isOnline = false; offlineBanner.classList.remove('hidden'); connectionBadge.className = 'badge offline'; connectionBadge.innerHTML = '<i class="fa-solid fa-wifi-slash"></i><span class="badge-text">Offline</span>'; updateSyncUI(); });

// Clickable Sync Badge
syncBadge.addEventListener('click', () => {
    if (!isSyncing && isOnline) {
        syncAll(true);
    }
});

// Sync timer updater
setInterval(updateSyncUI, 10000);

document.getElementById('tab-shopping').addEventListener('click', (e) => { currentTab = 'shopping'; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); renderUI(); });
document.getElementById('tab-catalog').addEventListener('click', (e) => { currentTab = 'catalog'; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); renderUI(); });
searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.trim(); renderUI(); });
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
    }
});
quickAddBtn.addEventListener('click', handleSearchSubmit);
document.getElementById('close-modal').addEventListener('click', () => { editModal.classList.add('hidden'); });
document.getElementById('cancel-edit').addEventListener('click', () => { editModal.classList.add('hidden'); });

// --- Mandarine Import Logic ---
const mandarineImportForm = document.getElementById('mandarine-import-form');
if (mandarineImportForm) {
    mandarineImportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('mandarine-url').value.trim();
        const db = document.getElementById('mandarine-db').value.trim();
        const user = document.getElementById('mandarine-user').value.trim();
        const pass = document.getElementById('mandarine-pass').value.trim();
        const statusDiv = document.getElementById('mandarine-import-status');
        const btn = document.getElementById('mandarine-import-btn');
        
        statusDiv.style.color = 'var(--text-main)';
        statusDiv.textContent = 'Connessione a CouchDB in corso...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/fetch_mandarine_db', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    couchdb_url: url,
                    database_name: db,
                    username: user,
                    password: pass
                })
            });
            
            if (res.status === 401) { window.location.href = '/login'; return; }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Errore di connessione');
            }
            
            const data = await res.json();
            const docs = (data.rows || []).map(r => r.doc).filter(d => d);
            
            const itemDocs = docs.filter(d => d.type === 'item');
            
            let importedCount = 0;
            const now = Date.now();
            
            itemDocs.forEach(mItem => {
                // Check if we already have it by name (case insensitive)
                const existingIndex = items.findIndex(i => i.name.toLowerCase() === mItem.name.toLowerCase());
                
                // Check if it's "needed" in any mandarine list
                let isNeeded = 0;
                if (mItem.lists && Array.isArray(mItem.lists)) {
                    // active and not completed
                    const activeList = mItem.lists.find(l => l.active && !l.completed);
                    if (activeList) isNeeded = 1;
                }
                
                let qty = "";
                if (mItem.lists && mItem.lists[0] && mItem.lists[0].quantity) {
                    qty = mItem.lists[0].quantity.toString();
                }
                
                if (existingIndex > -1) {
                    // Update existing only if it becomes needed, else ignore
                    if (isNeeded === 1 && items[existingIndex].needed === 0) {
                        items[existingIndex].needed = 1;
                        items[existingIndex].deleted = 0;
                        items[existingIndex].quantity = qty || items[existingIndex].quantity;
                        items[existingIndex].updated_at = now;
                        importedCount++;
                    }
                } else {
                    // Create new
                    const newItem = {
                        id: generateId(),
                        name: mItem.name,
                        quantity: qty,
                        category: getAutoCategory(mItem.name),
                        needed: isNeeded,
                        deleted: 0,
                        updated_at: now
                    };
                    items.push(newItem);
                    importedCount++;
                }
            });
            
            saveItemsLocally();
            renderUI();
            if (isOnline) syncItems();
            
            statusDiv.style.color = '#10b981'; // Green
            statusDiv.textContent = `Importazione completata! ${importedCount} articoli aggiunti o aggiornati.`;
            mandarineImportForm.reset();
            
        } catch(e) {
            console.error(e);
            statusDiv.style.color = '#ef4444'; // Red
            statusDiv.textContent = e.message;
        } finally {
            btn.disabled = false;
        }
    });
}

// Boot
init();
updateSyncUI();
