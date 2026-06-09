function initBlueprint() {
    const container = document.getElementById('blueprint');
    if (!container) return;

    const canvas = container.querySelector('#bp-canvas');
    const svgLayer = container.querySelector('#bp-connections');
    const nodesLayer = container.querySelector('#bp-nodes');
    const viewport = container.querySelector('#bp-viewport');
    const palette = container.querySelector('#bp-palette');
    const paletteList = container.querySelector('#bp-palette-list');
    const contextMenu = container.querySelector('#bp-context-menu');
    const searchInput = container.querySelector('#bp-search-input');
    const searchResults = container.querySelector('#bp-search-results');
    const executeBtn = container.querySelector('#bp-execute-btn');
    const clearBtn = container.querySelector('#bp-clear-btn');
    const previewModal = container.querySelector('#bp-preview-modal');
    const previewBtn = container.querySelector('#bp-preview-btn');
    const realtimeToggle = container.querySelector('#bp-realtime-toggle');
    const realtimeLabel = container.querySelector('#bp-realtime-label');
    const saveBtn = container.querySelector('#bp-save-btn');
    const loadBtn = container.querySelector('#bp-load-btn');

    let realtimeEnabled = false;
    let realtimeTimer = null;

    if (!canvas || !svgLayer || !nodesLayer) return;

    const NODE_TYPES = {
        'load-image': { category: '输入', name: '加载图片', icon: 'fa-image', color: '#4caf50', inputs: [], outputs: [{ name: '图片', type: 'image' }], params: [] },
        'video-frames': { category: '输入', name: '提取视频帧', icon: 'fa-film', color: '#e91e63', inputs: [], outputs: [{ name: '帧序列', type: 'image' }], params: [
            { name: 'FPS', key: 'fps', type: 'number', default: 24, min: 1, max: 60 }
        ]},
        'resize': { category: '变换', name: '调整大小', icon: 'fa-expand', color: '#2196f3', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '宽度', key: 'width', type: 'number', default: 512, min: 1, max: 4096 },
            { name: '高度', key: 'height', type: 'number', default: 512, min: 1, max: 4096 }
        ]},
        'flip-rotate': { category: '变换', name: '翻转/旋转', icon: 'fa-arrows-alt-h', color: '#ff9800', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '水平翻转', key: 'flipH', type: 'checkbox', default: false },
            { name: '垂直翻转', key: 'flipV', type: 'checkbox', default: false },
            { name: '旋转', key: 'rotate', type: 'select', default: '0', options: ['0', '90', '180', '270'] }
        ]},
        'crop': { category: '变换', name: '裁剪', icon: 'fa-crop', color: '#9c27b0', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: 'X', key: 'x', type: 'number', default: 0, min: 0, max: 4096 },
            { name: 'Y', key: 'y', type: 'number', default: 0, min: 0, max: 4096 },
            { name: '宽度', key: 'w', type: 'number', default: 256, min: 1, max: 4096 },
            { name: '高度', key: 'h', type: 'number', default: 256, min: 1, max: 4096 }
        ]},
        'color-adjust': { category: '调色', name: '色彩调整', icon: 'fa-palette', color: '#e91e63', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '亮度', key: 'brightness', type: 'range', default: 0, min: -100, max: 100 },
            { name: '对比度', key: 'contrast', type: 'range', default: 0, min: -100, max: 100 },
            { name: '饱和度', key: 'saturation', type: 'range', default: 0, min: -100, max: 100 }
        ]},
        'grayscale': { category: '调色', name: '灰度化', icon: 'fa-adjust', color: '#607d8b', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [] },
        'threshold': { category: '调色', name: '阈值', icon: 'fa-circle-half-stroke', color: '#795548', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '阈值', key: 'value', type: 'range', default: 128, min: 0, max: 255 }
        ]},
        'blend': { category: '调色', name: '混合', icon: 'fa-layer-group', color: '#00bcd4', inputs: [{ name: '图片A', type: 'image' }, { name: '图片B', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '模式', key: 'mode', type: 'select', default: 'normal', options: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'] },
            { name: '透明度', key: 'opacity', type: 'range', default: 100, min: 0, max: 100 }
        ]},
        'sprite-merge': { category: '图集', name: '合并图集', icon: 'fa-table-cells', color: '#ff5722', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图集', type: 'image' }], params: [
            { name: '行数', key: 'rows', type: 'number', default: 4, min: 1, max: 100 },
            { name: '方向', key: 'direction', type: 'select', default: 'lr-tb', options: ['lr-tb', 'rl-tb', 'lr-bt', 'rl-bt'] }
        ]},
        'sprite-split': { category: '图集', name: '拆分图集', icon: 'fa-border-all', color: '#ff5722', inputs: [{ name: '图集', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '行数', key: 'rows', type: 'number', default: 4, min: 1, max: 100 },
            { name: '列数', key: 'cols', type: 'number', default: 4, min: 1, max: 100 },
            { name: '方向', key: 'direction', type: 'select', default: 'lr-tb', options: ['lr-tb', 'rl-tb', 'lr-bt', 'rl-bt'] }
        ]},
        'perfect-pixel': { category: '特效', name: '完美像素', icon: 'fa-th', color: '#9c27b0', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '网格宽度', key: 'gridWMode', type: 'select', default: 'auto', options: ['auto', 'power2', 'manual'] },
            { name: '宽度(power2)', key: 'gridW', type: 'select', default: '256', options: ['32', '64', '128', '256', '512', '1024', '2048'] },
            { name: '宽度(手动)', key: 'gridWManual', type: 'number', default: 256, min: 1, max: 4096 },
            { name: '网格高度', key: 'gridHMode', type: 'select', default: 'auto', options: ['auto', 'power2', 'manual'] },
            { name: '高度(power2)', key: 'gridH', type: 'select', default: '256', options: ['32', '64', '128', '256', '512', '1024', '2048'] },
            { name: '高度(手动)', key: 'gridHManual', type: 'number', default: 256, min: 1, max: 4096 },
            { name: '采样方法', key: 'method', type: 'select', default: 'center', options: ['center', 'median', 'majority'] },
            { name: '精炼强度', key: 'refine', type: 'range', default: 25, min: 0, max: 50 },
            { name: '减少杂色', key: 'denoise', type: 'checkbox', default: false },
            { name: '阈值', key: 'denoiseThreshold', type: 'range', default: 15, min: 1, max: 100 }
        ]},
        'bg-remove': { category: '特效', name: 'AI 去背景', icon: 'fa-user-slash', color: '#8b5cf6', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '输出类型', key: 'outputType', type: 'select', default: 'foreground', options: ['foreground', 'mask', 'background'] },
            { name: '背景填充', key: 'bgFill', type: 'select', default: 'none', options: ['none', 'white', 'black'] }
        ]},
        'export': { category: '输出', name: '导出', icon: 'fa-download', color: '#f44336', inputs: [{ name: '图片', type: 'image' }], outputs: [], params: [
            { name: '格式', key: 'format', type: 'select', default: 'image/png', options: ['image/png', 'image/jpeg', 'image/webp'] },
            { name: '质量', key: 'quality', type: 'range', default: 92, min: 10, max: 100 }
        ]},
        'file-sort': { category: '输出', name: '排序/重命名', icon: 'fa-sort-alpha-down', color: '#607d8b', inputs: [{ name: '图片', type: 'image' }], outputs: [{ name: '图片', type: 'image' }], params: [
            { name: '前缀', key: 'prefix', type: 'text', default: 'output_' },
            { name: '起始编号', key: 'startIndex', type: 'number', default: 0, min: 0, max: 9999 },
            { name: '位数', key: 'digits', type: 'number', default: 3, min: 1, max: 6 }
        ]}
    };

    let nodes = [];
    let connections = [];
    let nextNodeId = 1;
    let nextConnId = 1;
    let panX = 0, panY = 0, zoom = 1;
    let selectedNodeId = null;
    let selectedConnId = null;

    let dragInfo = null;
    let connectDrag = null;
    let isPanning = false;
    let panStart = null;
    let panOrigX = 0, panOrigY = 0;

    function genNodeId() { return 'n' + (nextNodeId++); }
    function genConnId() { return 'c' + (nextConnId++); }

    function getPortScreenPos(portEl) {
        const cr = canvas.getBoundingClientRect();
        const pr = portEl.getBoundingClientRect();
        return { x: pr.left + pr.width / 2 - cr.left, y: pr.top + pr.height / 2 - cr.top };
    }

    function updateViewport() {
        viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        viewport.style.transformOrigin = '0 0';
        renderAllConnections();
    }

    function findNodeById(id) { return nodes.find(n => n.id === id); }
    function findConnById(id) { return connections.find(c => c.id === id); }

    function getConnectedInputNodes(nodeId, portName) {
        const conns = connections.filter(c => c.toNodeId === nodeId && c.toPort === portName);
        return conns.map(c => findNodeById(c.fromNodeId)).filter(Boolean);
    }

    function nodeHasInputConnection(nodeId, portName) {
        return connections.some(c => c.toNodeId === nodeId && c.toPort === portName);
    }

    function nodeHasOutputConnection(nodeId, portName) {
        return connections.some(c => c.fromNodeId === nodeId && c.fromPort === portName);
    }

    function createNodeElement(node) {
        const typeDef = NODE_TYPES[node.type];
        const el = document.createElement('div');
        el.className = 'bp-node' + (node.id === selectedNodeId ? ' bp-node-selected' : '');
        el.dataset.nodeId = node.id;
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';
        el.style.setProperty('--node-color', typeDef.color);

        let html = `<div class="bp-node-header">
            <i class="fas ${typeDef.icon}"></i>
            <span>${typeDef.name}</span>
            <button class="bp-node-delete" title="删除节点">&times;</button>
        </div>
        <div class="bp-node-body">`;

        // Ports bar at top
        if (typeDef.inputs.length > 0 || typeDef.outputs.length > 0) {
            html += '<div class="bp-ports-bar">';
            html += '<div class="bp-ports-left">';
            typeDef.inputs.forEach((input, i) => {
                html += `<div class="bp-port bp-port-input" data-node-id="${node.id}" data-port-name="${input.name}" data-port-type="input">
                    <span class="bp-port-dot"></span>
                    <span class="bp-port-label">${input.name}</span>
                </div>`;
            });
            html += '</div>';
            html += '<div class="bp-ports-right">';
            typeDef.outputs.forEach((output, i) => {
                html += `<div class="bp-port bp-port-output" data-node-id="${node.id}" data-port-name="${output.name}" data-port-type="output">
                    <span class="bp-port-label">${output.name}</span>
                    <span class="bp-port-dot"></span>
                </div>`;
            });
            html += '</div></div>';
        }

        if (typeDef.params.length > 0) {
            html += '<div class="bp-node-params">';
            typeDef.params.forEach(param => {
                const val = node.params[param.key] !== undefined ? node.params[param.key] : param.default;
                if (param.type === 'number') {
                    html += `<label class="bp-param"><span>${param.name}</span><input type="number" data-param="${param.key}" value="${val}" min="${param.min || 0}" max="${param.max || 9999}" class="bp-param-input"></label>`;
                } else if (param.type === 'range') {
                    html += `<label class="bp-param"><span>${param.name}</span><input type="range" data-param="${param.key}" value="${val}" min="${param.min || 0}" max="${param.max || 100}" class="bp-param-range"><span class="bp-range-val">${val}</span></label>`;
                } else if (param.type === 'checkbox') {
                    html += `<label class="bp-param bp-param-check"><input type="checkbox" data-param="${param.key}" ${val ? 'checked' : ''}><span>${param.name}</span></label>`;
                } else if (param.type === 'text') {
                    html += `<label class="bp-param"><span>${param.name}</span><input type="text" data-param="${param.key}" value="${String(val).replace(/"/g, '&quot;')}" class="bp-param-input" style="width:70px;"></label>`;
                } else if (param.type === 'select') {
                    html += `<label class="bp-param"><span>${param.name}</span><select data-param="${param.key}" class="bp-param-select">${param.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
                }
            });
            html += '</div>';
        }

        html += '<div class="bp-node-preview"><span class="bp-node-preview-label">预览</span></div>';

        html += '</div>';
        el.innerHTML = html;

        el.querySelector('.bp-node-delete').addEventListener('click', e => { e.stopPropagation(); removeNode(node.id); });
        el.addEventListener('mousedown', e => onNodeMouseDown(e, node.id));

        const inputs = el.querySelectorAll('.bp-port-input');
        inputs.forEach(port => {
            port.addEventListener('mouseup', e => onInputPortMouseUp(e, port));
        });

        return el;
    }

    function renderNode(node) {
        const existing = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
        if (existing) existing.remove();
        const el = createNodeElement(node);
        nodesLayer.appendChild(el);
        setupPortDragEvents(el);
    }

    function setupPortDragEvents(nodeEl) {
        const outputPorts = nodeEl.querySelectorAll('.bp-port-output');
        outputPorts.forEach(port => {
            port.addEventListener('mousedown', e => {
                if (e.button !== 0) return;
                e.stopPropagation();
                e.preventDefault();
                const nodeId = port.dataset.nodeId;
                const portName = port.dataset.portName;
                const pos = getPortScreenPos(port);
                connectDrag = { fromNodeId: nodeId, fromPortName: portName, sx: pos.x, sy: pos.y };
                const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                tempPath.classList.add('bp-conn-temp');
                tempPath.setAttribute('d', getConnectionPath(pos.x, pos.y, pos.x, pos.y));
                svgLayer.appendChild(tempPath);
            });
        });
    }

    function renderAllConnections() {
        svgLayer.innerHTML = '';
        connections.forEach(conn => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.classList.add('bp-conn');
            if (conn.id === selectedConnId) path.classList.add('bp-conn-selected');
            path.dataset.connId = conn.id;
            path.setAttribute('d', getConnectionScreenPath(conn));
            path.addEventListener('click', e => {
                e.stopPropagation();
                selectConnection(conn.id);
            });
            svgLayer.appendChild(path);
        });
    }

    function getConnectionScreenPath(conn) {
        const fromNode = findNodeById(conn.fromNodeId);
        const toNode = findNodeById(conn.toNodeId);
        if (!fromNode || !toNode) return '';
        const fromPort = document.querySelector(`[data-node-id="${conn.fromNodeId}"][data-port-name="${conn.fromPort}"]`);
        const toPort = document.querySelector(`[data-node-id="${conn.toNodeId}"][data-port-name="${conn.toPort}"]`);
        if (!fromPort || !toPort) return '';
        const fp = getPortScreenPos(fromPort);
        const tp = getPortScreenPos(toPort);
        return getConnectionPath(fp.x, fp.y, tp.x, tp.y);
    }

    function getConnectionPath(x1, y1, x2, y2) {
        const dx = Math.max(Math.abs(x2 - x1) * 0.5, 30);
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    }

    function renderAll() {
        nodesLayer.innerHTML = '';
        nodes.forEach(n => {
            const el = createNodeElement(n);
            nodesLayer.appendChild(el);
            setupPortDragEvents(el);
        });
        renderAllConnections();
    }

    function addNode(type, x, y) {
        const typeDef = NODE_TYPES[type];
        const params = {};
        typeDef.params.forEach(p => { params[p.key] = p.default; });
        const node = { id: genNodeId(), type, x: (x - panX) / zoom, y: (y - panY) / zoom, params };
        nodes.push(node);
        const el = createNodeElement(node);
        nodesLayer.appendChild(el);
        setupPortDragEvents(el);
        selectNode(node.id);
        return node;
    }

    function removeNode(nodeId) {
        connections = connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
        nodes = nodes.filter(n => n.id !== nodeId);
        if (selectedNodeId === nodeId) selectedNodeId = null;
        renderAll();
    }

    function addConnection(fromNodeId, fromPort, toNodeId, toPort) {
        const exists = connections.some(c =>
            c.fromNodeId === fromNodeId && c.fromPort === fromPort &&
            c.toNodeId === toNodeId && c.toPort === toPort
        );
        if (exists || fromNodeId === toNodeId) return false;
        const existingInput = connections.find(c => c.toNodeId === toNodeId && c.toPort === toPort);
        if (existingInput) { removeConnection(existingInput.id); }
        const conn = { id: genConnId(), fromNodeId, fromPort, toNodeId, toPort };
        connections.push(conn);
        renderAllConnections();
        return conn;
    }

    function removeConnection(connId) {
        connections = connections.filter(c => c.id !== connId);
        if (selectedConnId === connId) selectedConnId = null;
        renderAllConnections();
    }

    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        selectedConnId = null;
        nodesLayer.querySelectorAll('.bp-node-selected').forEach(el => el.classList.remove('bp-node-selected'));
        const el = nodesLayer.querySelector(`[data-node-id="${nodeId}"]`);
        if (el) el.classList.add('bp-node-selected');
        renderAllConnections();
    }

    function selectConnection(connId) {
        selectedConnId = connId;
        selectedNodeId = null;
        nodesLayer.querySelectorAll('.bp-node-selected').forEach(el => el.classList.remove('bp-node-selected'));
        renderAllConnections();
    }

    function clearGraph() {
        nodes = [];
        connections = [];
        selectedNodeId = null;
        selectedConnId = null;
        renderAll();
    }

    function onNodeMouseDown(e, nodeId) {
        if (e.button !== 0) return;
        if (e.target.closest('.bp-port') || e.target.closest('.bp-node-delete') || e.target.closest('.bp-param-input') || e.target.closest('.bp-param-range') || e.target.closest('.bp-param-select') || e.target.closest('input[type="checkbox"]')) return;
        e.stopPropagation();
        e.preventDefault();
        selectNode(nodeId);
        const node = findNodeById(nodeId);
        dragInfo = { nodeId, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
    }

    canvas.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.bp-node')) return;
        if (e.target.closest('#bp-context-menu')) return;
        e.preventDefault();
        selectedNodeId = null;
        selectedConnId = null;
        nodesLayer.querySelectorAll('.bp-node-selected').forEach(el => el.classList.remove('bp-node-selected'));
        renderAllConnections();
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        panOrigX = panX;
        panOrigY = panY;
        canvas.style.cursor = 'grabbing';
        hideContextMenu();
    });

    window.addEventListener('mousemove', function(e) {
        if (dragInfo) {
            const dx = (e.clientX - dragInfo.sx) / zoom;
            const dy = (e.clientY - dragInfo.sy) / zoom;
            const node = findNodeById(dragInfo.nodeId);
            node.x = dragInfo.ox + dx;
            node.y = dragInfo.oy + dy;
            const el = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
            if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
            renderAllConnections();
        }
        if (connectDrag) {
            const cr = canvas.getBoundingClientRect();
            const mx = e.clientX - cr.left;
            const my = e.clientY - cr.top;
            const tempPath = svgLayer.querySelector('.bp-conn-temp');
            if (tempPath) {
                tempPath.setAttribute('d', getConnectionPath(connectDrag.sx, connectDrag.sy, mx, my));
            }
        }
        if (isPanning && panStart) {
            panX = panOrigX + (e.clientX - panStart.x);
            panY = panOrigY + (e.clientY - panStart.y);
            updateViewport();
        }
    });

    window.addEventListener('mouseup', function(e) {
        if (dragInfo) { dragInfo = null; }
        if (connectDrag) {
            const tempPath = svgLayer.querySelector('.bp-conn-temp');
            if (tempPath) tempPath.remove();
            connectDrag = null;
        }
        if (isPanning) {
            isPanning = false;
            panStart = null;
            canvas.style.cursor = '';
        }
    });

    function onInputPortMouseUp(e, portEl) {
        if (!connectDrag) return;
        e.stopPropagation();
        e.preventDefault();
        const toNodeId = portEl.dataset.nodeId;
        const toPortName = portEl.dataset.portName;
        if (connectDrag.fromNodeId && connectDrag.fromPortName) {
            addConnection(connectDrag.fromNodeId, connectDrag.fromPortName, toNodeId, toPortName);
        }
        const tempPath = svgLayer.querySelector('.bp-conn-temp');
        if (tempPath) tempPath.remove();
        connectDrag = null;
    }

    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        const cr = canvas.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.15, Math.min(3, zoom * factor));
        panX = mx - (mx - panX) * (newZoom / zoom);
        panY = my - (my - panY) * (newZoom / zoom);
        zoom = newZoom;
        updateViewport();
    }, { passive: false });

    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) return;
            if (!container.classList.contains('active')) return;
            if (selectedNodeId) { removeNode(selectedNodeId); }
            else if (selectedConnId) { removeConnection(selectedConnId); }
        }
    });

    function showContextMenu(x, y) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
        contextMenu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
        searchInput.value = '';
        searchInput.focus();
        filterSearchResults('');
        setTimeout(() => searchInput.focus(), 50);
    }

    function hideContextMenu() { contextMenu.style.display = 'none'; }

    function filterSearchResults(query) {
        const q = query.toLowerCase();
        searchResults.innerHTML = '';
        const types = Object.entries(NODE_TYPES).filter(([key, def]) =>
            !q || def.name.toLowerCase().includes(q) || key.toLowerCase().includes(q)
        );
        types.forEach(([key, def]) => {
            const item = document.createElement('div');
            item.className = 'bp-search-item';
            item.innerHTML = `<i class="fas ${def.icon}" style="color:${def.color}"></i><span>${def.name}</span><span class="bp-search-cat">${def.category || ''}</span>`;
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                const cr = canvas.getBoundingClientRect();
                const menuRect = contextMenu.getBoundingClientRect();
                const cx = menuRect.left - cr.left;
                const cy = menuRect.top - cr.top;
                addNode(key, cx, cy);
                hideContextMenu();
            });
            searchResults.appendChild(item);
        });
    }

    searchInput.addEventListener('input', () => filterSearchResults(searchInput.value));
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') hideContextMenu();
        if (e.key === 'Enter') {
            const first = searchResults.querySelector('.bp-search-item');
            if (first) first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        }
    });

    document.addEventListener('mousedown', function(e) {
        if (!contextMenu.contains(e.target) && contextMenu.style.display === 'block') {
            hideContextMenu();
        }
    });

    canvas.addEventListener('click', function(e) {
        if (e.target === canvas || e.target === viewport) { hideContextMenu(); }
    });

    function populatePalette() {
        paletteList.innerHTML = '';
        const categories = {};
        Object.entries(NODE_TYPES).forEach(([key, def]) => {
            const cat = def.category || '其他';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push([key, def]);
        });
        const catOrder = ['输入', '变换', '调色', '图集', '特效', '输出'];
        catOrder.forEach(cat => {
            if (!categories[cat]) return;
            const header = document.createElement('div');
            header.className = 'bp-palette-category';
            header.innerHTML = `<span>${cat}</span><i class="fas fa-chevron-down"></i>`;
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'bp-palette-category-items';
            categories[cat].forEach(([key, def]) => {
                const item = document.createElement('div');
                item.className = 'bp-palette-item';
                item.draggable = true;
                item.dataset.nodeType = key;
                item.innerHTML = `<i class="fas ${def.icon}" style="color:${def.color}"></i><span>${def.name}</span>`;
                item.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', key);
                    e.dataTransfer.effectAllowed = 'copy';
                });
                itemsDiv.appendChild(item);
            });
            header.addEventListener('click', () => {
                itemsDiv.classList.toggle('collapsed');
                header.classList.toggle('collapsed');
            });
            itemsDiv.classList.add('collapsed');
            header.classList.add('collapsed');
            paletteList.appendChild(header);
            paletteList.appendChild(itemsDiv);
        });
    }

    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        if (!nodeType || !NODE_TYPES[nodeType]) return;
        const cr = canvas.getBoundingClientRect();
        const x = e.clientX - cr.left;
        const y = e.clientY - cr.top;
        addNode(nodeType, x, y);
    });

    nodesLayer.addEventListener('input', function(e) {
        const paramEl = e.target.closest('[data-param]');
        if (!paramEl) return;
        const nodeEl = paramEl.closest('.bp-node');
        if (!nodeEl) return;
        const nodeId = nodeEl.dataset.nodeId;
        const node = findNodeById(nodeId);
        if (!node) return;
        const key = paramEl.dataset.param;
        let value;
        if (paramEl.type === 'checkbox') value = paramEl.checked;
        else if (paramEl.type === 'range') {
            value = parseInt(paramEl.value);
            const valSpan = paramEl.parentElement.querySelector('.bp-range-val');
            if (valSpan) valSpan.textContent = value;
        } else if (paramEl.type === 'number') value = parseInt(paramEl.value) || 0;
        else if (paramEl.type === 'text') value = paramEl.value;
        else value = paramEl.value;
        node.params[key] = value;
        debouncedRefreshPreviews();
    });

    nodesLayer.addEventListener('change', function(e) {
        const paramEl = e.target.closest('[data-param]');
        if (!paramEl || paramEl.type === 'range' || paramEl.type === 'number') return;
        const nodeEl = paramEl.closest('.bp-node');
        if (!nodeEl) return;
        const nodeId = nodeEl.dataset.nodeId;
        const node = findNodeById(nodeId);
        if (!node) return;
        const key = paramEl.dataset.param;
        node.params[key] = paramEl.type === 'checkbox' ? paramEl.checked : paramEl.value;
        debouncedRefreshPreviews();
    });

    nodesLayer.addEventListener('dblclick', function(e) {
        const nodeEl = e.target.closest('.bp-node');
        if (!nodeEl) return;
        const node = findNodeById(nodeEl.dataset.nodeId);
        if (!node || node.type !== 'load-image') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.addEventListener('change', function() {
            const files = Array.from(input.files);
            if (files.length === 0) return;
            node.cachedCanvases = [];
            node.loadedImages = [];
            let loaded = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        node.cachedCanvases.push(canvas);
                        node.loadedImages.push(img);
                        loaded++;
                        if (loaded === files.length) {
                            if (node.cachedCanvases.length === 1) node.cachedCanvas = node.cachedCanvases[0];
                            const sizes = node.cachedCanvases.map(c => `${c.width}x${c.height}`).join(', ');
                            const infoEl = nodeEl.querySelector('.bp-load-info');
                            const text = `${node.cachedCanvases.length}张 | ${sizes}`;
                            if (infoEl) { infoEl.textContent = text; }
                            else {
                                const div = document.createElement('div');
                                div.className = 'bp-load-info';
                                div.textContent = text;
                                nodeEl.querySelector('.bp-node-body').appendChild(div);
                            }
                        }
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            });
        });
        input.click();
    });

    nodesLayer.addEventListener('dblclick', function(e) {
        const nodeEl = e.target.closest('.bp-node');
        if (!nodeEl) return;
        const node = findNodeById(nodeEl.dataset.nodeId);
        if (!node || node.type !== 'video-frames') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.addEventListener('change', function() {
            const file = input.files[0];
            if (!file) return;
            node.videoFile = file;
            const infoEl = nodeEl.querySelector('.bp-load-info');
            const text = `视频: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
            if (infoEl) { infoEl.textContent = text; }
            else {
                const div = document.createElement('div');
                div.className = 'bp-load-info';
                div.textContent = text;
                nodeEl.querySelector('.bp-node-body').appendChild(div);
            }
        });
        input.click();
    });

    function topologicalSort() {
        const inDegree = {};
        const adj = {};
        nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
        connections.forEach(c => {
            if (!adj[c.fromNodeId]) return;
            adj[c.fromNodeId].push(c.toNodeId);
            inDegree[c.toNodeId] = (inDegree[c.toNodeId] || 0) + 1;
        });
        const queue = [];
        const sorted = [];
        nodes.forEach(n => { if (inDegree[n.id] === 0) queue.push(n.id); });
        while (queue.length > 0) {
            const id = queue.shift();
            sorted.push(id);
            (adj[id] || []).forEach(nextId => {
                inDegree[nextId]--;
                if (inDegree[nextId] === 0) queue.push(nextId);
            });
        }
        if (sorted.length !== nodes.length) {
            showNotification('图中存在循环依赖，无法执行', 'error');
            return null;
        }
        return sorted;
    }

    function getInputValue(nodeId, portName) {
        const conn = connections.find(c => c.toNodeId === nodeId && c.toPort === portName);
        if (!conn) return null;
        const from = findNodeById(conn.fromNodeId);
        if (!from || !from.outputValue) return null;
        return from.outputValue;
    }

    async function executeGraph() {
        const sorted = topologicalSort();
        if (!sorted) return;
        let hasError = false;
        for (const nodeId of sorted) {
            const node = findNodeById(nodeId);
            if (!node) continue;
            const typeDef = NODE_TYPES[node.type];
            try {
                node.outputValue = await processNode(node, typeDef);
            } catch (err) {
                console.error('节点执行失败:', node.type, err);
                showNotification(`节点 "${typeDef.name}" 执行失败: ${err.message}`, 'error');
                hasError = true;
                node.outputValue = null;
            }
        }
        if (!hasError) { showNotification('蓝图执行完成', 'success'); }
        updateNodePreviews();
        const exportNodes = nodes.filter(n => n.type === 'export' && n.outputValue);
        if (exportNodes.length > 0) { showPreviewModal(exportNodes); }
    }

    function updateNodePreviews() {
        nodes.forEach(node => {
            const nodeEl = nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
            if (!nodeEl) return;
            const previewArea = nodeEl.querySelector('.bp-node-preview');
            if (!previewArea) return;
            if (!node.outputValue) {
                previewArea.classList.remove('has-preview');
                const oldCanvas = previewArea.querySelector('canvas');
                if (oldCanvas) oldCanvas.remove();
                return;
            }
            const canvases = Array.isArray(node.outputValue) ? node.outputValue : [node.outputValue];
            if (canvases.length === 0) return;
            const src = canvases[0];
            previewArea.classList.add('has-preview');
            const label = previewArea.querySelector('.bp-node-preview-label');
            if (label) { label.textContent = canvases.length > 1 ? `预览 (${canvases.length}张)` : '预览'; }
            let thumbCanvas = previewArea.querySelector('canvas');
            if (!thumbCanvas) {
                thumbCanvas = document.createElement('canvas');
                previewArea.appendChild(thumbCanvas);
            }
            const maxW = 130, maxH = 80;
            const scale = Math.min(maxW / src.width, maxH / src.height, 1);
            thumbCanvas.width = src.width * scale;
            thumbCanvas.height = src.height * scale;
            thumbCanvas.getContext('2d').drawImage(src, 0, 0, thumbCanvas.width, thumbCanvas.height);
        });
    }

    async function refreshPreviews() {
        const loadNodes = nodes.filter(n => n.type === 'load-image');
        const videoNodes = nodes.filter(n => n.type === 'video-frames');
        const missingImage = loadNodes.some(n => !n.cachedCanvases || n.cachedCanvases.length === 0);
        const missingVideo = videoNodes.some(n => !n.videoFile);
        if (loadNodes.length > 0 && missingImage) { showNotification('请先双击"加载图片"节点加载图片', 'warning'); return; }
        if (videoNodes.length > 0 && missingVideo) { showNotification('请先双击"提取视频帧"节点选择视频', 'warning'); return; }
        const sorted = topologicalSort();
        if (!sorted) return;
        let hasError = false;
        for (const nodeId of sorted) {
            const node = findNodeById(nodeId);
            if (!node) continue;
            const typeDef = NODE_TYPES[node.type];
            try { node.outputValue = await processNode(node, typeDef); }
            catch (err) { hasError = true; node.outputValue = null; }
        }
        if (!hasError) { showNotification('预览已刷新', 'success'); }
        updateNodePreviews();
    }

    function debouncedRefreshPreviews() {
        if (realtimeTimer) clearTimeout(realtimeTimer);
        if (!realtimeEnabled) return;
        realtimeTimer = setTimeout(() => refreshPreviews(), 300);
    }

    async function processNode(node, typeDef) {
        if (node.type === 'load-image') {
            if (node.cachedCanvases && node.cachedCanvases.length > 0) {
                return node.cachedCanvases.length === 1 ? node.cachedCanvases[0] : node.cachedCanvases;
            }
            throw new Error('未加载图片，请双击节点加载');
        }
        if (node.type === 'export') {
            const inputCanvas = getInputValue(node.id, typeDef.inputs[0].name);
            if (!inputCanvas) throw new Error('缺少输入图片');
            return inputCanvas;
        }
        if (node.type === 'blend') {
            const inputA = getInputValue(node.id, typeDef.inputs[0].name);
            const inputB = getInputValue(node.id, typeDef.inputs[1].name);
            if (!inputA || !inputB) throw new Error('缺少输入图片');
            if (Array.isArray(inputA) || Array.isArray(inputB)) throw new Error('混合节点不支持多图输入');
            return processSingleImage(node, typeDef, inputA, inputB);
        }
        if (node.type === 'video-frames') {
            if (!node.videoFile) throw new Error('未加载视频，请双击节点选择视频文件');
            const fps = node.params.fps || 24;
            return await extractVideoFrames(node.videoFile, fps);
        }
        if (node.type === 'sprite-merge') {
            const inputVal = getInputValue(node.id, typeDef.inputs[0].name);
            if (!inputVal) throw new Error('缺少输入图片');
            const images = Array.isArray(inputVal) ? inputVal : [inputVal];
            if (images.length < 2) throw new Error('合并需要至少2张图片');
            return mergeSpriteSheet(images, node.params.rows || 4, node.params.direction || 'lr-tb');
        }
        if (node.type === 'sprite-split') {
            const inputVal = getInputValue(node.id, typeDef.inputs[0].name);
            if (!inputVal) throw new Error('缺少输入图片');
            const inputs = Array.isArray(inputVal) ? inputVal : [inputVal];
            const allSprites = [];
            for (const src of inputs) {
                const sprites = splitSpriteSheet(src, node.params.rows || 4, node.params.cols || 4, node.params.direction || 'lr-tb');
                allSprites.push(...sprites);
            }
            return allSprites.length === 1 ? allSprites[0] : allSprites;
        }
        if (node.type === 'file-sort') {
            const inputVal = getInputValue(node.id, typeDef.inputs[0].name);
            if (!inputVal) throw new Error('缺少输入图片');
            const images = Array.isArray(inputVal) ? inputVal : [inputVal];
            const prefix = node.params.prefix || 'output_';
            const startIndex = node.params.startIndex || 0;
            const digits = node.params.digits || 3;
            images.forEach((img, i) => {
                const num = String(startIndex + i).padStart(digits, '0');
                img._blueprintName = prefix + num;
            });
            return images.length === 1 ? images[0] : images;
        }
        if (node.type === 'bg-remove') {
            const inputVal = getInputValue(node.id, typeDef.inputs[0].name);
            if (!inputVal) throw new Error('缺少输入图片');
            const inputs = Array.isArray(inputVal) ? inputVal : [inputVal];
            const lib = window.__bgRemovalLib;
            if (!lib) throw new Error('AI 模型尚未加载，请先访问 AI 去背景工具页以激活模型');
            const outputType = node.params.outputType || 'foreground';
            const bgFill = node.params.bgFill || 'none';
            const bgPath = new URL('./wwwroot/lib/bg-removal/dist/', location.href).href;
            let processFn = lib.removeBackground;
            if (outputType === 'mask') processFn = lib.segmentForeground || lib.alphamask;
            if (outputType === 'background') processFn = lib.removeForeground;
            const results = [];
            for (const src of inputs) {
                const blob = await canvasToBlob(src);
                const resultBlob = await processFn(blob, { publicPath: bgPath, model: 'isnet_fp16', device: 'cpu', proxyToWorker: false, output: { format: 'image/png' } });
                let resultCanvas = await blobToCanvas(resultBlob);
                if (outputType === 'foreground' && bgFill !== 'none') {
                    const bgColor = bgFill === 'white' ? '#FFFFFF' : '#000000';
                    resultCanvas = await applyBackgroundFill(resultCanvas, bgColor);
                }
                results.push(resultCanvas);
            }
            return results.length === 1 ? results[0] : results;
        }
        const inputVal = getInputValue(node.id, typeDef.inputs[0].name);
        if (!inputVal) throw new Error('缺少输入图片');
        const inputs = Array.isArray(inputVal) ? inputVal : [inputVal];
        const results = inputs.map(img => processSingleImage(node, typeDef, img));
        return results.length === 1 ? results[0] : results;
    }

    function processSingleImage(node, typeDef, inputCanvas, inputCanvas2) {
        switch (node.type) {
            case 'resize': {
                const w = node.params.width || 512;
                const h = node.params.height || 512;
                const oc = document.createElement('canvas');
                oc.width = w; oc.height = h;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, 0, 0, w, h);
                return oc;
            }
            case 'flip-rotate': {
                const flipH = node.params.flipH;
                const flipV = node.params.flipV;
                const rotate = parseInt(node.params.rotate || '0');
                let w = inputCanvas.width, h = inputCanvas.height;
                if (rotate === 90 || rotate === 270) { [w, h] = [h, w]; }
                const oc = document.createElement('canvas');
                oc.width = w; oc.height = h;
                const ctx = oc.getContext('2d');
                ctx.save();
                ctx.translate(w / 2, h / 2);
                ctx.rotate(rotate * Math.PI / 180);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.drawImage(inputCanvas, -inputCanvas.width / 2, -inputCanvas.height / 2);
                ctx.restore();
                return oc;
            }
            case 'crop': {
                const x = node.params.x || 0;
                const y = node.params.y || 0;
                const w = Math.min(node.params.w || 256, inputCanvas.width - x);
                const h = Math.min(node.params.h || 256, inputCanvas.height - y);
                const oc = document.createElement('canvas');
                oc.width = w; oc.height = h;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, x, y, w, h, 0, 0, w, h);
                return oc;
            }
            case 'color-adjust': {
                const brightness = node.params.brightness || 0;
                const contrast = node.params.contrast || 0;
                const saturation = node.params.saturation || 0;
                const oc = document.createElement('canvas');
                oc.width = inputCanvas.width; oc.height = inputCanvas.height;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, 0, 0);
                const imageData = ctx.getImageData(0, 0, oc.width, oc.height);
                const data = imageData.data;
                const b = brightness * 2.55;
                const c = (contrast + 100) / 100;
                const s = (saturation + 100) / 100;
                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i], g = data[i + 1], bl = data[i + 2];
                    r = (r - 128) * c + 128 + b;
                    g = (g - 128) * c + 128 + b;
                    bl = (bl - 128) * c + 128 + b;
                    if (s !== 1) {
                        const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
                        r = gray + (r - gray) * s;
                        g = gray + (g - gray) * s;
                        bl = gray + (bl - gray) * s;
                    }
                    data[i] = Math.max(0, Math.min(255, r));
                    data[i + 1] = Math.max(0, Math.min(255, g));
                    data[i + 2] = Math.max(0, Math.min(255, bl));
                }
                ctx.putImageData(imageData, 0, 0);
                return oc;
            }
            case 'grayscale': {
                const oc = document.createElement('canvas');
                oc.width = inputCanvas.width; oc.height = inputCanvas.height;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, 0, 0);
                const imageData = ctx.getImageData(0, 0, oc.width, oc.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
                ctx.putImageData(imageData, 0, 0);
                return oc;
            }
            case 'threshold': {
                const threshold = node.params.value || 128;
                const oc = document.createElement('canvas');
                oc.width = inputCanvas.width; oc.height = inputCanvas.height;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, 0, 0);
                const imageData = ctx.getImageData(0, 0, oc.width, oc.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const v = gray >= threshold ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = v;
                }
                ctx.putImageData(imageData, 0, 0);
                return oc;
            }
            case 'blend': {
                const mode = node.params.mode || 'normal';
                const opacity = (node.params.opacity || 100) / 100;
                const w = Math.max(inputCanvas.width, inputCanvas2.width);
                const h = Math.max(inputCanvas.height, inputCanvas2.height);
                const oc = document.createElement('canvas');
                oc.width = w; oc.height = h;
                const ctx = oc.getContext('2d');
                if (mode === 'normal') {
                    ctx.globalAlpha = opacity;
                    ctx.drawImage(inputCanvas, 0, 0);
                    ctx.globalAlpha = 1;
                    ctx.drawImage(inputCanvas2, 0, 0);
                } else {
                    ctx.drawImage(inputCanvas2, 0, 0);
                    ctx.globalCompositeOperation = mode;
                    ctx.globalAlpha = opacity;
                    ctx.drawImage(inputCanvas, 0, 0);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
                return oc;
            }
            case 'perfect-pixel': {
                const oc = document.createElement('canvas');
                oc.width = inputCanvas.width; oc.height = inputCanvas.height;
                const ctx = oc.getContext('2d');
                ctx.drawImage(inputCanvas, 0, 0);
                const imageData = ctx.getImageData(0, 0, oc.width, oc.height);
                const gridWMode = node.params.gridWMode || 'auto';
                const gridHMode = node.params.gridHMode || 'auto';
                let gw = null, gh = null;
                if (gridWMode === 'power2') gw = parseInt(node.params.gridW || '256');
                else if (gridWMode === 'manual') gw = parseInt(node.params.gridWManual) || 256;
                if (gridHMode === 'power2') gh = parseInt(node.params.gridH || '256');
                else if (gridHMode === 'manual') gh = parseInt(node.params.gridHManual) || 256;
                const refine = (node.params.refine || 0) / 100;
                const method = node.params.method || 'center';
                const denoise = node.params.denoise || false;
                const denoiseThr = node.params.denoiseThreshold || 15;
                const result = window.perfectPixelProcess(imageData, gw, gh, refine, method, denoise, denoiseThr);
                if (!result) throw new Error('完美像素处理失败');
                const minDim = Math.min(result.width, result.height);
                const scale = minDim > 0 ? Math.max(1, Math.ceil(200 / minDim)) : 1;
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = result.width; tempCanvas.height = result.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
                const outCanvas = document.createElement('canvas');
                outCanvas.width = result.width * scale;
                outCanvas.height = result.height * scale;
                const outCtx = outCanvas.getContext('2d');
                outCtx.imageSmoothingEnabled = false;
                outCtx.drawImage(tempCanvas, 0, 0, outCanvas.width, outCanvas.height);
                return outCanvas;
            }
            default:
                throw new Error('未知节点类型: ' + node.type);
        }
    }

    function extractVideoFrames(videoFile, fps) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.src = URL.createObjectURL(videoFile);
            video.addEventListener('loadedmetadata', () => {
                const duration = video.duration;
                const totalFrames = Math.max(1, Math.min(Math.floor(duration * fps), 500));
                const interval = duration / (totalFrames + 1);
                const canvases = [];
                let idx = 0;
                video.addEventListener('seeked', function handler() {
                    const c = document.createElement('canvas');
                    c.width = video.videoWidth;
                    c.height = video.videoHeight;
                    c.getContext('2d', { alpha: true }).drawImage(video, 0, 0);
                    canvases.push(c);
                    idx++;
                    if (idx < totalFrames) {
                        video.currentTime = interval * (idx + 1);
                    } else {
                        video.removeEventListener('seeked', handler);
                        URL.revokeObjectURL(video.src);
                        resolve(canvases);
                    }
                });
                video.currentTime = interval;
            });
            video.addEventListener('error', () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('视频加载失败'));
            });
        });
    }

    function mergeSpriteSheet(images, rows, direction) {
        const spW = images[0].width, spH = images[0].height;
        const cols = Math.ceil(images.length / rows);
        const c = document.createElement('canvas');
        c.width = spW * cols;
        c.height = spH * rows;
        const ctx = c.getContext('2d');
        images.forEach((img, i) => {
            const { row, col } = getGridPos(i, rows, cols, direction);
            ctx.drawImage(img, col * spW, row * spH, spW, spH);
        });
        return c;
    }

    function getGridPos(index, rows, cols, dir) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        switch (dir) {
            case 'lr-tb': return { row, col };
            case 'rl-tb': return { row, col: cols - 1 - col };
            case 'lr-bt': return { row: rows - 1 - row, col };
            case 'rl-bt': return { row: rows - 1 - row, col: cols - 1 - col };
        }
        return { row, col };
    }

    function splitSpriteSheet(sheet, rows, cols, direction) {
        const sw = Math.floor(sheet.width / cols);
        const sh = Math.floor(sheet.height / rows);
        const sprites = [];
        for (let i = 0; i < rows * cols; i++) {
            const { row, col } = getGridPos(i, rows, cols, direction);
            const c = document.createElement('canvas');
            c.width = sw; c.height = sh;
            c.getContext('2d').drawImage(sheet, col * sw, row * sh, sw, sh, 0, 0, sw, sh);
            sprites.push(c);
        }
        return sprites;
    }

    function closePreviewModal() {
        if (previewModal._stopPlayback) {
            previewModal._stopPlayback.forEach(fn => fn());
            previewModal._stopPlayback = [];
        }
        previewModal.style.display = 'none';
    }

    function showPreviewModal(exportNodes) {
        closePreviewModal();
        previewModal.innerHTML = '';
        exportNodes.forEach((node, idx) => {
            const canvases = Array.isArray(node.outputValue) ? node.outputValue : [node.outputValue];
            if (canvases.length === 0) return;
            let currentIdx = 0;
            const wrapper = document.createElement('div');
            wrapper.className = 'bp-preview-item';
            const hdr = document.createElement('h4');
            hdr.textContent = '导出结果 ' + (idx + 1);
            wrapper.appendChild(hdr);
            const counter = document.createElement('span');
            counter.style.cssText = 'font-size:0.75rem;color:var(--color-text-tertiary);margin-left:8px;';
            counter.textContent = canvases.length > 1 ? `[1 / ${canvases.length}]` : '';
            hdr.appendChild(counter);
            const img = document.createElement('img');
            img.src = canvases[0].toDataURL();
            img.style.cssText = 'max-width:100%;max-height:400px;display:block;border-radius:4px;margin:0 auto;';
            wrapper.appendChild(img);
            const info = document.createElement('p');
            info.textContent = '尺寸: ' + canvases[0].width + 'x' + canvases[0].height;
            wrapper.appendChild(info);

            function updatePreview() {
                img.src = canvases[currentIdx].toDataURL();
                info.textContent = '尺寸: ' + canvases[currentIdx].width + 'x' + canvases[currentIdx].height;
                counter.textContent = canvases.length > 1 ? `[${currentIdx + 1} / ${canvases.length}]` : '';
                const nc = navRow.querySelector('.bp-nav-counter');
                if (nc) nc.textContent = `${currentIdx + 1} / ${canvases.length}`;
            }

            const navRow = document.createElement('div');
            navRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;';
            if (canvases.length > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'bp-btn-small';
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                prevBtn.addEventListener('click', () => { currentIdx = (currentIdx - 1 + canvases.length) % canvases.length; updatePreview(); });
                navRow.appendChild(prevBtn);
                const idxSpan = document.createElement('span');
                idxSpan.className = 'bp-nav-counter';
                idxSpan.style.cssText = 'font-size:0.78rem;color:var(--color-text-primary);min-width:60px;text-align:center;';
                idxSpan.textContent = `${currentIdx + 1} / ${canvases.length}`;
                navRow.appendChild(idxSpan);
                const nextBtn = document.createElement('button');
                nextBtn.className = 'bp-btn-small';
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                nextBtn.addEventListener('click', () => { currentIdx = (currentIdx + 1) % canvases.length; updatePreview(); });
                navRow.appendChild(nextBtn);
            }
            wrapper.appendChild(navRow);

            if (canvases.length > 1) {
                let playTimer = null;
                const playBar = document.createElement('div');
                playBar.className = 'bp-playback-bar';
                const playBtn = document.createElement('button');
                playBtn.className = 'bp-btn-small';
                playBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
                playBtn.addEventListener('click', () => {
                    if (playTimer) { clearInterval(playTimer); playTimer = null; playBtn.innerHTML = '<i class="fas fa-play"></i> 播放'; return; }
                    const speed = parseInt(playBar.querySelector('select').value) || 500;
                    playBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
                    playTimer = setInterval(() => { currentIdx = (currentIdx + 1) % canvases.length; updatePreview(); }, speed);
                });
                playBar.appendChild(playBtn);
                const speedLabel = document.createElement('span');
                speedLabel.style.cssText = 'font-size:0.7rem;color:var(--color-text-tertiary);';
                speedLabel.textContent = '速度:';
                playBar.appendChild(speedLabel);
                const speedSel = document.createElement('select');
                speedSel.innerHTML = '<option value="100" selected>100ms</option><option value="250">250ms</option><option value="500">500ms</option><option value="1000">1000ms</option>';
                speedSel.addEventListener('change', () => {
                    if (playTimer) { clearInterval(playTimer); const speed = parseInt(speedSel.value) || 500; playTimer = setInterval(() => { currentIdx = (currentIdx + 1) % canvases.length; updatePreview(); }, speed); }
                });
                playBar.appendChild(speedSel);
                wrapper.appendChild(playBar);
                const stopPlayback = () => { if (playTimer) { clearInterval(playTimer); playTimer = null; } };
                previewModal._stopPlayback = previewModal._stopPlayback || [];
                previewModal._stopPlayback.push(stopPlayback);
            }

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;justify-content:center;';
            const dlCurrentBtn = document.createElement('button');
            dlCurrentBtn.className = 'bp-btn-small';
            dlCurrentBtn.innerHTML = '<i class="fas fa-download"></i> 下载当前';
            dlCurrentBtn.addEventListener('click', () => { downloadCanvas(canvases[currentIdx], node.params, idx, currentIdx); });
            btnRow.appendChild(dlCurrentBtn);
            if (canvases.length > 1) {
                const dlAllBtn = document.createElement('button');
                dlAllBtn.className = 'bp-btn-small';
                dlAllBtn.innerHTML = '<i class="fas fa-file-archive"></i> 下载全部';
                dlAllBtn.addEventListener('click', () => {
                    canvases.forEach((c, i) => { setTimeout(() => downloadCanvas(c, node.params, idx, i), i * 200); });
                    showNotification('正在下载 ' + canvases.length + ' 张图片...', 'info');
                });
                btnRow.appendChild(dlAllBtn);
            }
            const closeBtn = document.createElement('button');
            closeBtn.className = 'bp-btn-small';
            closeBtn.textContent = '关闭';
            closeBtn.addEventListener('click', () => { closePreviewModal(); });
            btnRow.appendChild(closeBtn);
            wrapper.appendChild(btnRow);
            previewModal.appendChild(wrapper);
        });
        const closeAll = document.createElement('button');
        closeAll.className = 'bp-btn-small';
        closeAll.textContent = '关闭全部';
        closeAll.style.marginTop = '12px';
        closeAll.addEventListener('click', () => { closePreviewModal(); });
        previewModal.appendChild(closeAll);
        previewModal.style.display = 'flex';
    }

    function downloadCanvas(canvas, params, nodeIdx, imgIdx) {
        const format = params.format || 'image/png';
        const quality = (params.quality || 92) / 100;
        const ext = format.split('/')[1];
        const bpName = canvas._blueprintName;
        const filename = bpName ? `${bpName}.${ext}` : `output_${nodeIdx + 1}_${imgIdx + 1}.${ext}`;
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }, format, quality);
    }

    function saveBlueprint() {
        const data = {
            version: 1,
            timestamp: new Date().toISOString(),
            nodes: nodes.map(n => ({ id: n.id, type: n.type, x: Math.round(n.x), y: Math.round(n.y), params: n.params })),
            connections: connections.map(c => ({ fromNodeId: c.fromNodeId, fromPort: c.fromPort, toNodeId: c.toNodeId, toPort: c.toPort })),
            nextNodeId: nextNodeId,
            nextConnId: nextConnId
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blueprint_' + data.timestamp.slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('蓝图已保存', 'success');
    }

    function loadBlueprint() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', function() {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.nodes || !data.connections) throw new Error('无效的蓝图文件');
                    clearGraph();
                    nodes = data.nodes.map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y, params: n.params || {} }));
                    connections = data.connections.map(c => ({ id: c.id || genConnId(), fromNodeId: c.fromNodeId, fromPort: c.fromPort, toNodeId: c.toNodeId, toPort: c.toPort }));
                    nextNodeId = data.nextNodeId || Math.max(0, ...nodes.map(n => parseInt(n.id.slice(1)))) + 1;
                    nextConnId = data.nextConnId || 1;
                    renderAll();
                    updateViewport();
                    showNotification('已加载蓝图 (' + nodes.length + ' 个节点, ' + connections.length + ' 条连线)', 'success');
                } catch (err) { showNotification('加载蓝图失败: ' + err.message, 'error'); }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    executeBtn.addEventListener('click', () => {
        const loadNodes = nodes.filter(n => n.type === 'load-image');
        const videoNodes = nodes.filter(n => n.type === 'video-frames');
        const missingImage = loadNodes.some(n => !n.cachedCanvases || n.cachedCanvases.length === 0);
        const missingVideo = videoNodes.some(n => !n.videoFile);
        const hasSource = loadNodes.length > 0 || videoNodes.length > 0;
        if (!hasSource && nodes.length > 0) { showNotification('请添加至少一个"加载图片"或"提取视频帧"节点', 'warning'); return; }
        if (missingImage) { showNotification('请双击"加载图片"节点加载图片', 'warning'); return; }
        if (missingVideo) { showNotification('请双击"提取视频帧"节点选择视频', 'warning'); return; }
        const exportNodes = nodes.filter(n => n.type === 'export');
        if (exportNodes.length === 0 && nodes.length > 0) { showNotification('请添加至少一个"导出"节点', 'warning'); return; }
        executeGraph();
    });

    clearBtn.addEventListener('click', () => { clearGraph(); showNotification('画布已清空', 'info'); });

    previewBtn.addEventListener('click', () => {
        if (nodes.length === 0) { showNotification('画布为空，请先添加节点', 'warning'); return; }
        refreshPreviews();
    });

    realtimeLabel.addEventListener('click', () => {
        realtimeEnabled = !realtimeEnabled;
        realtimeToggle.classList.toggle('active', realtimeEnabled);
        if (realtimeEnabled) { showNotification('实时预览已开启', 'info'); refreshPreviews(); }
        else { showNotification('实时预览已关闭', 'info'); if (realtimeTimer) clearTimeout(realtimeTimer); }
    });

    saveBtn.addEventListener('click', () => {
        if (nodes.length === 0) { showNotification('画布为空，无法保存', 'warning'); return; }
        saveBlueprint();
    });

    loadBtn.addEventListener('click', () => loadBlueprint());

    populatePalette();
    updateViewport();
    palette.addEventListener('mousedown', e => e.stopPropagation());
    palette.addEventListener('wheel', e => e.stopPropagation());
    contextMenu.addEventListener('mousedown', e => e.stopPropagation());
    previewModal.addEventListener('mousedown', e => { if (e.target === previewModal) closePreviewModal(); });
    window.addEventListener('resize', () => renderAllConnections());
    function connectionRenderLoop() {
        if (dragInfo || isPanning) { renderAllConnections(); }
        requestAnimationFrame(connectionRenderLoop);
    }
    requestAnimationFrame(connectionRenderLoop);

    function canvasToBlob(canvas) {
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
    }

    async function blobToCanvas(blob) {
        const img = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas;
    }

    async function applyBackgroundFill(canvas, bgColor) {
        const oc = document.createElement('canvas');
        oc.width = canvas.width;
        oc.height = canvas.height;
        const ctx = oc.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, oc.width, oc.height);
        ctx.drawImage(canvas, 0, 0);
        return oc;
    }

    console.log('Blueprint tool initialized');
}
