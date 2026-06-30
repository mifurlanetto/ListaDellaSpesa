// Map Editor Logic
let mapEditorCtx = null;
let currentMapSupId = null;
let mapData = { nodes: {}, edges: [] }; // nodes: {id: {x,y,floor,type,label,icon}}, edges: [{u, v}]
let currentFloor = 0;
let mapTool = 'move'; // move, connect, erase
let selectedNode = null; // for connection
let dragNode = null;
let isDraggingMap = false;
let mapOffset = { x: 0, y: 0 };
let dragStart = { x: 0, y: 0 };

const canvas = document.getElementById('store-map-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
    if(!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (document.getElementById('store-map-modal').classList.contains('hidden') === false) {
        renderMap();
    }
}
window.addEventListener('resize', resizeCanvas);

window.openStoreMap = function(supId) {
    currentMapSupId = supId;
    const sup = appSettings.supermarkets[supId];
    document.getElementById('store-map-title').textContent = `Mappa: ${sup.name}`;
    
    // Initialize or load map data
    mapData = sup.graph ? JSON.parse(JSON.stringify(sup.graph)) : { nodes: {}, edges: [] };
    
    // Ensure entrance and checkout exist
    if (!mapData.nodes['entrance']) mapData.nodes['entrance'] = { x: 50, y: 50, floor: 0, type: 'entrance', label: 'Ingresso', icon: '🚪' };
    if (!mapData.nodes['checkout']) mapData.nodes['checkout'] = { x: 250, y: 50, floor: 0, type: 'checkout', label: 'Casse', icon: '🛒' };
    
    currentFloor = 0;
    updateFloorDisplay();
    setMapTool('move');
    mapOffset = { x: 0, y: 0 };
    
    document.getElementById('store-map-modal').classList.remove('hidden');
    // small delay to let DOM render before resizing canvas
    setTimeout(() => {
        resizeCanvas();
        updateUnplacedList();
    }, 10);
};

function setMapTool(tool) {
    mapTool = tool;
    selectedNode = null;
    document.querySelectorAll('[id^="tool-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tool-' + tool).classList.add('active');
    canvas.style.cursor = tool === 'move' ? 'grab' : (tool === 'connect' ? 'crosshair' : 'pointer');
}

document.getElementById('tool-move').addEventListener('click', () => setMapTool('move'));
document.getElementById('tool-connect').addEventListener('click', () => setMapTool('connect'));
document.getElementById('tool-erase').addEventListener('click', () => setMapTool('erase'));

document.getElementById('floor-up-btn').addEventListener('click', () => { currentFloor++; updateFloorDisplay(); renderMap(); updateUnplacedList(); });
document.getElementById('floor-down-btn').addEventListener('click', () => { currentFloor--; updateFloorDisplay(); renderMap(); updateUnplacedList(); });

function updateFloorDisplay() {
    document.getElementById('current-floor-display').textContent = currentFloor;
}

function updateUnplacedList() {
    const list = document.getElementById('unplaced-nodes-list');
    list.innerHTML = '';
    
    // Categories not in mapData.nodes
    Object.keys(appSettings.categories).forEach(catId => {
        if (!mapData.nodes[catId]) {
            const cat = appSettings.categories[catId];
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.textAlign = 'left';
            btn.innerHTML = `<i class="fa-solid fa-plus"></i> ${cat.icon} ${cat.label}`;
            btn.onclick = () => {
                // Place at center of current view
                mapData.nodes[catId] = {
                    x: canvas.width/2 - mapOffset.x,
                    y: canvas.height/2 - mapOffset.y,
                    floor: currentFloor,
                    type: 'category',
                    label: cat.label,
                    icon: cat.icon
                };
                updateUnplacedList();
                renderMap();
            };
            list.appendChild(btn);
        }
    });
}

document.getElementById('add-stairs-btn').addEventListener('click', () => {
    const id = 'stairs_' + Date.now();
    mapData.nodes[id] = {
        x: canvas.width/2 - mapOffset.x,
        y: canvas.height/2 - mapOffset.y,
        floor: currentFloor,
        type: 'stairs',
        label: 'Scale/Ascensore',
        icon: '↕️'
    };
    renderMap();
});

document.getElementById('save-map-btn').addEventListener('click', () => {
    appSettings.supermarkets[currentMapSupId].graph = JSON.parse(JSON.stringify(mapData));
    saveSettingsLocally(); // This triggers sync and re-renders UI
    document.getElementById('store-map-modal').classList.add('hidden');
});

document.getElementById('close-map-btn').addEventListener('click', () => {
    document.getElementById('store-map-modal').classList.add('hidden');
});

// Canvas Interaction
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function getNodeAt(x, y) {
    const worldX = x - mapOffset.x;
    const worldY = y - mapOffset.y;
    
    for (const [id, node] of Object.entries(mapData.nodes)) {
        if (node.floor !== currentFloor) continue;
        const dx = worldX - node.x;
        const dy = worldY - node.y;
        if (dx*dx + dy*dy <= 400) { // radius 20
            return id;
        }
    }
    return null;
}

if(canvas) {
    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        const clickedNodeId = getNodeAt(pos.x, pos.y);
        
        if (mapTool === 'move') {
            if (clickedNodeId) {
                dragNode = clickedNodeId;
            } else {
                isDraggingMap = true;
                dragStart = { x: pos.x - mapOffset.x, y: pos.y - mapOffset.y };
                canvas.style.cursor = 'grabbing';
            }
        } else if (mapTool === 'connect') {
            if (clickedNodeId) {
                if (selectedNode) {
                    if (selectedNode !== clickedNodeId) {
                        const exists = mapData.edges.some(edge => (edge.u === selectedNode && edge.v === clickedNodeId) || (edge.v === selectedNode && edge.u === clickedNodeId));
                        if (!exists) {
                            mapData.edges.push({ u: selectedNode, v: clickedNodeId });
                        }
                    }
                    selectedNode = null;
                } else {
                    selectedNode = clickedNodeId;
                }
                renderMap();
            } else {
                selectedNode = null;
                renderMap();
            }
        } else if (mapTool === 'erase') {
            if (clickedNodeId) {
                if (mapData.nodes[clickedNodeId].type !== 'entrance' && mapData.nodes[clickedNodeId].type !== 'checkout') {
                    delete mapData.nodes[clickedNodeId];
                    mapData.edges = mapData.edges.filter(edge => edge.u !== clickedNodeId && edge.v !== clickedNodeId);
                    updateUnplacedList();
                    renderMap();
                }
            } else {
                const worldX = pos.x - mapOffset.x;
                const worldY = pos.y - mapOffset.y;
                let edgeToDelete = -1;
                for (let i = 0; i < mapData.edges.length; i++) {
                    const edge = mapData.edges[i];
                    const n1 = mapData.nodes[edge.u];
                    const n2 = mapData.nodes[edge.v];
                    if(!n1 || !n2 || (n1.floor !== currentFloor && n2.floor !== currentFloor)) continue;
                    
                    const l2 = (n1.x - n2.x)**2 + (n1.y - n2.y)**2;
                    if (l2 === 0) continue;
                    let t = ((worldX - n1.x) * (n2.x - n1.x) + (worldY - n1.y) * (n2.y - n1.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const projX = n1.x + t * (n2.x - n1.x);
                    const projY = n1.y + t * (n2.y - n1.y);
                    const dist2 = (worldX - projX)**2 + (worldY - projY)**2;
                    
                    if (dist2 < 100) {
                        edgeToDelete = i;
                        break;
                    }
                }
                if (edgeToDelete > -1) {
                    mapData.edges.splice(edgeToDelete, 1);
                    renderMap();
                }
            }
        }
    });

    canvas.addEventListener('mousemove', e => {
        const pos = getMousePos(e);
        if (dragNode) {
            mapData.nodes[dragNode].x = pos.x - mapOffset.x;
            mapData.nodes[dragNode].y = pos.y - mapOffset.y;
            renderMap();
        } else if (isDraggingMap) {
            mapOffset.x = pos.x - dragStart.x;
            mapOffset.y = pos.y - dragStart.y;
            renderMap();
        }
    });

    canvas.addEventListener('mouseup', () => {
        dragNode = null;
        isDraggingMap = false;
        if (mapTool === 'move') canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('mouseleave', () => {
        dragNode = null;
        isDraggingMap = false;
    });
}

function renderMap() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let x = mapOffset.x % 50; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y = mapOffset.y % 50; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(mapOffset.x, mapOffset.y);
    
    // Draw edges
    ctx.lineWidth = 3;
    mapData.edges.forEach(edge => {
        const n1 = mapData.nodes[edge.u];
        const n2 = mapData.nodes[edge.v];
        if (!n1 || !n2) return;
        
        if (n1.floor !== currentFloor && n2.floor !== currentFloor) return;
        
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        
        if (n1.floor !== currentFloor || n2.floor !== currentFloor) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'; // Orange dotted for cross-floor
            ctx.setLineDash([5, 5]);
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.setLineDash([]);
        }
        ctx.stroke();
    });
    ctx.setLineDash([]);
    
    // Draw selected node highlight
    if (selectedNode && mapData.nodes[selectedNode] && mapData.nodes[selectedNode].floor === currentFloor) {
        const n = mapData.nodes[selectedNode];
        ctx.beginPath();
        ctx.arc(n.x, n.y, 25, 0, 2*Math.PI);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Draw nodes
    for (const [id, node] of Object.entries(mapData.nodes)) {
        if (node.floor !== currentFloor) continue;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
        
        if (node.type === 'entrance') ctx.fillStyle = '#10b981';
        else if (node.type === 'checkout') ctx.fillStyle = '#ef4444';
        else if (node.type === 'stairs') ctx.fillStyle = '#8b5cf6';
        else ctx.fillStyle = '#3b82f6';
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.icon || '', node.x, node.y);
        
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        // Add text shadow for legibility
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(node.label, node.x, node.y + 32);
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
}
