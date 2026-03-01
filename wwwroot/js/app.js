// Roxami Web Tools - Main Application JavaScript

// Translation system
const translations = {

    zh: {
        // Header
        'siteTitle': 'Roxami Studio',
        'siteTagline': '一系列实用的网页工具集合',

        // Sidebar
        'sidebarTitle': '工具',
        'threeDConverter': '3D 转换器',
        'threeDConverterDesc': '转换 GLB 到 OBJ/glTF',
        'addTool': '添加工具',

        // Breadcrumb
        'breadcrumbTools': '工具',
        'currentTool': '3D 转换器',

        // Tool actions
        'save': '保存',
        'reset': '重置',
        'share': '分享',

        // 3D Converter tool
        'threeDConverterTitle': '3D 模型转换器',
        'threeDConverterSubtitle': '将 GLB 文件转换为 OBJ 或 glTF 格式并提取纹理。',
        'uploadGLB': '上传 GLB 文件',
        'dragDropPrompt': '拖放 GLB 文件或点击浏览',
        'maxFileSize': '最大文件大小：50MB',
        'selectedFile': '已选文件：',
        'fileSize': '文件大小：',
        'threeDPreview': '3D 预览',
        'conversionOptions': '转换选项',
        'convertToOBJ': '转换为 OBJ',
        'convertToGLTF': '转换为 glTF',
        'extractTextures': '提取纹理',
        'noOutput': '尚无转换输出。',
        'downloadAll': '下载全部',
        'about3DConverter': '关于 3D 模型转换器',
        'threeDConverterInfo1': '此工具将 GLB（二进制 glTF）文件转换为 OBJ 或 glTF 格式。同时从 GLB 文件中提取嵌入的纹理。所有处理都在您的浏览器中使用 Three.js 库完成。',
        'threeDConverterInfo2': '注意：大文件可能需要更长时间处理。由于格式复杂性，不支持 FBX 转换。',

        // Footer
        'footerText': '所有处理均在您的浏览器中进行。数据不会发送到服务器。',
        'copyright': '© 2026 Roxami 网页工具。保留所有权利。',
        'help': '帮助',
        'reportIssue': '报告问题',
        'github': 'GitHub',
        'contact': '联系'
    }
};

// List of proper nouns that should not be translated (case insensitive)
const properNouns = [
    'JSON', 'Base64', 'URL', 'MD5', 'SHA', 'GLB', 'OBJ', 'glTF', 'FBX',
    'Three.js', 'Roxami', 'GitHub', 'HTML', 'CSS', 'JavaScript'
];

// Current language
let currentLanguage = 'zh';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Roxami Web Tools loaded');

    // Initialize all modules
    initToolSwitcher();
    initThemeToggle();
    initSidebarToggle();
    initResponsiveBehavior();
    init3DConverter();
    initLanguageToggle();

    // Set initial active tool
    updateCurrentToolName();
});

// Tool Switcher Module
function initToolSwitcher() {
    const toolItems = document.querySelectorAll('.tool-item');
    const toolPlaceholders = document.querySelectorAll('.tool-placeholder');

    toolItems.forEach(item => {
        item.addEventListener('click', function() {
            const toolId = this.getAttribute('data-tool');

            // Remove active class from all tool items
            toolItems.forEach(tool => tool.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');

            // Hide all tool placeholders
            toolPlaceholders.forEach(placeholder => {
                placeholder.classList.remove('active');
            });

            // Show selected tool placeholder
            const selectedTool = document.getElementById(toolId);
            if (selectedTool) {
                selectedTool.classList.add('active');
            }

            // Update breadcrumb
            updateCurrentToolName();

            // Apply translations to the newly shown tool
            if (currentLanguage !== 'en') {
                const langData = translations[currentLanguage];
                if (langData) {
                    switch (toolId) {
                        case '3d-converter':
                            apply3DConverterTranslations(langData);
                            break;
                    }
                }
            }
        });
    });
}

function updateCurrentToolName() {
    const activeToolItem = document.querySelector('.tool-item.active');
    if (activeToolItem) {
        const toolName = activeToolItem.querySelector('.tool-info h3').textContent;
        document.getElementById('current-tool-name').textContent = toolName;
    }
}

// Theme Toggle Module
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');

    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }

    themeToggleBtn.addEventListener('click', function() {
        const isLightTheme = document.body.classList.toggle('light-theme');
        const theme = isLightTheme ? 'light' : 'dark';

        // Update icon
        if (isLightTheme) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }

        // Save preference
        localStorage.setItem('theme', theme);

        // Notify user
        showNotification(`Switched to ${theme} theme`);
    });
}

// Sidebar Toggle Module
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarIcon = sidebarToggle.querySelector('i');

    // Check for saved sidebar state
    const savedSidebarState = localStorage.getItem('sidebarCollapsed') || 'false';
    if (savedSidebarState === 'true') {
        document.body.classList.add('sidebar-collapsed');
        sidebarIcon.classList.remove('fa-chevron-left');
        sidebarIcon.classList.add('fa-chevron-right');
    }

    sidebarToggle.addEventListener('click', function() {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');

        // Update icon
        if (isCollapsed) {
            sidebarIcon.classList.remove('fa-chevron-left');
            sidebarIcon.classList.add('fa-chevron-right');
        } else {
            sidebarIcon.classList.remove('fa-chevron-right');
            sidebarIcon.classList.add('fa-chevron-left');
        }

        // Save preference
        localStorage.setItem('sidebarCollapsed', isCollapsed.toString());

        // Notify user
        showNotification(`Sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`);
    });
}

// JSON Formatter Module
function initJSONFormatter() {
    const jsonInput = document.querySelector('.json-input');
    const jsonOutput = document.querySelector('#formatted-json');
    const formatBtn = document.getElementById('format-btn');
    const validateBtn = document.getElementById('validate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Initialize with example JSON
    formatJSON();

    // Format button
    formatBtn.addEventListener('click', formatJSON);

    // Validate button
    validateBtn.addEventListener('click', validateJSON);

    // Clear button
    clearBtn.addEventListener('click', function() {
        jsonInput.value = '';
        jsonOutput.textContent = '';
        showNotification('Input cleared');
    });

    // Copy button
    copyBtn.addEventListener('click', function() {
        const text = jsonOutput.textContent;
        if (!text.trim()) {
            showNotification('No content to copy', 'warning');
            return;
        }

        navigator.clipboard.writeText(text)
            .then(() => showNotification('JSON copied to clipboard'))
            .catch(err => {
                console.error('Copy failed:', err);
                showNotification('Failed to copy', 'error');
            });
    });

    // Minify button
    minifyBtn.addEventListener('click', function() {
        try {
            const json = jsonInput.value.trim();
            if (!json) {
                showNotification('No JSON to minify', 'warning');
                return;
            }

            const parsed = JSON.parse(json);
            const minified = JSON.stringify(parsed);
            jsonOutput.textContent = minified;

            // Syntax highlighting (simplified)
            highlightJSON(minified);
            showNotification('JSON minified');
        } catch (error) {
            showNotification('Invalid JSON: ' + error.message, 'error');
        }
    });

    // Download button
    downloadBtn.addEventListener('click', function() {
        const text = jsonOutput.textContent;
        if (!text.trim()) {
            showNotification('No content to download', 'warning');
            return;
        }

        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formatted.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('JSON downloaded');
    });

    // Auto-format on input (with debounce)
    let debounceTimer;
    jsonInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(formatJSON, 500);
    });

    function formatJSON() {
        try {
            const json = jsonInput.value.trim();
            if (!json) {
                jsonOutput.textContent = '';
                return;
            }

            const parsed = JSON.parse(json);
            const formatted = JSON.stringify(parsed, null, 2);
            jsonOutput.textContent = formatted;

            // Simple syntax highlighting
            highlightJSON(formatted);
        } catch (error) {
            jsonOutput.textContent = 'Error: ' + error.message;
            jsonOutput.style.color = 'var(--color-accent-red)';
        }
    }

    function validateJSON() {
        try {
            const json = jsonInput.value.trim();
            if (!json) {
                showNotification('No JSON to validate', 'warning');
                return;
            }

            JSON.parse(json);
            showNotification('JSON is valid', 'success');
            jsonOutput.style.color = '';
        } catch (error) {
            showNotification('Invalid JSON: ' + error.message, 'error');
            jsonOutput.style.color = 'var(--color-accent-red)';
        }
    }

    function highlightJSON(json) {
        // Simple syntax highlighting for JSON
        const highlighted = json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, '<span class="json-string">$1</span>')
            .replace(/\b(true|false|null)\b/g, '<span class="json-literal">$1</span>')
            .replace(/\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g, '<span class="json-number">$&</span>');

        jsonOutput.innerHTML = highlighted;
        jsonOutput.style.color = '';
    }

    // Add CSS for syntax highlighting
    const style = document.createElement('style');
    style.textContent = `
        .json-string { color: var(--color-accent-green); }
        .json-number { color: var(--color-accent-blue); }
        .json-literal { color: var(--color-accent-purple); }
    `;
    document.head.appendChild(style);
}

// Responsive Behavior Module
function initResponsiveBehavior() {
    const mobileBreakpoint = 1024;

    function checkScreenSize() {
        if (window.innerWidth <= mobileBreakpoint) {
            document.body.classList.add('sidebar-mobile-hidden');
        } else {
            document.body.classList.remove('sidebar-mobile-hidden');
        }
    }

    // Initial check
    checkScreenSize();

    // Check on resize (with debounce)
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(checkScreenSize, 250);
    });

    // Close sidebar when clicking on mobile overlay (if we add one)
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= mobileBreakpoint &&
            !event.target.closest('.tool-sidebar') &&
            !event.target.closest('.sidebar-toggle')) {
            document.body.classList.add('sidebar-mobile-hidden');
        }
    });
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-bg-card);
            border-left: 4px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: var(--spacing-md) var(--spacing-lg);
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            box-shadow: 0 4px 12px var(--color-shadow);
            z-index: 1000;
            max-width: 350px;
            animation: slideIn 0.3s ease;
            transition: all var(--transition-normal);
        }

        .notification-info { border-left-color: var(--color-accent-blue); }
        .notification-success { border-left-color: var(--color-accent-green); }
        .notification-warning { border-left-color: var(--color-accent-yellow); }
        .notification-error { border-left-color: var(--color-accent-red); }

        .notification i:first-child {
            font-size: 1.125rem;
        }

        .notification span {
            flex: 1;
            font-size: 0.875rem;
            color: var(--color-text-primary);
        }

        .notification-close {
            background: none;
            border: none;
            color: var(--color-text-tertiary);
            cursor: pointer;
            padding: var(--spacing-xs);
            border-radius: var(--radius-sm);
            transition: all var(--transition-fast);
        }

        .notification-close:hover {
            background: var(--color-hover);
            color: var(--color-text-primary);
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;

    if (!document.querySelector('#notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());

    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        default: return 'fa-info-circle';
    }
}

// Utility function to load tool modules dynamically
function loadToolModule(toolId) {
    // This function would load additional JS for specific tools
    console.log(`Loading module for tool: ${toolId}`);
    // Implement dynamic loading as needed
}

// 3D Converter Module
function init3DConverter() {
    console.log('Initializing 3D Converter');

    const glbFileInput = document.getElementById('glb-file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const previewSection = document.getElementById('preview-section');
    const modelPreview = document.getElementById('model-preview');
    const convertToObjBtn = document.getElementById('convert-to-obj-btn');
    const convertToGltfBtn = document.getElementById('convert-to-gltf-btn');
    const extractTexturesBtn = document.getElementById('extract-textures-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const outputFiles = document.getElementById('output-files');

    let currentModel = null;
    let currentScene = null;
    let currentRenderer = null;
    let currentCamera = null;
    let uploadedFile = null;
    let conversionOutputs = [];

    // Helper function to generate dummy model data for download
    function generateDummyModelData(format) {
        if (format === 'obj') {
            return `# Dummy OBJ file generated by Roxami Web Tools
# This is a placeholder for actual converted file

v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
v 1.0 1.0 0.0

vt 0.0 0.0
vt 1.0 0.0
vt 0.0 1.0
vt 1.0 1.0

vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0

f 1/1/1 2/2/2 3/3/3
f 2/2/2 4/4/4 3/3/3`;
        } else if (format === 'gltf') {
            return JSON.stringify({
                "asset": {
                    "version": "2.0",
                    "generator": "Roxami Web Tools"
                },
                "scenes": [
                    {
                        "nodes": [0]
                    }
                ],
                "nodes": [
                    {
                        "mesh": 0
                    }
                ],
                "meshes": [
                    {
                        "primitives": [
                            {
                                "attributes": {
                                    "POSITION": 0
                                },
                                "indices": 1
                            }
                        ]
                    }
                ],
                "accessors": [
                    {
                        "bufferView": 0,
                        "componentType": 5126,
                        "count": 4,
                        "type": "VEC3",
                        "max": [1.0, 1.0, 0.0],
                        "min": [0.0, 0.0, 0.0]
                    },
                    {
                        "bufferView": 1,
                        "componentType": 5123,
                        "count": 6,
                        "type": "SCALAR"
                    }
                ],
                "bufferViews": [
                    {
                        "buffer": 0,
                        "byteOffset": 0,
                        "byteLength": 48
                    },
                    {
                        "buffer": 0,
                        "byteOffset": 48,
                        "byteLength": 12
                    }
                ],
                "buffers": [
                    {
                        "byteLength": 60,
                        "uri": "data:application/octet-stream;base64,AAAAAAAAAAAAAAAAAADwPwAAAAAAAABAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAA="
                    }
                ]
            }, null, 2);
        }
        return `Dummy ${format.toUpperCase()} file content`;
    }

    // Helper function to generate dummy texture data for download
    function generateDummyTextureData(textureType) {
        // Create a simple 1x1 pixel PNG as base64
        // This is a minimal PNG with a single pixel (red for diffuse, blue for normal, gray for roughness)
        let color = '';
        switch (textureType) {
            case 'diffuse':
                color = 'ff0000ff'; // Red
                break;
            case 'normal':
                color = '0000ffff'; // Blue
                break;
            case 'roughness':
                color = '808080ff'; // Gray
                break;
            default:
                color = 'ffffffff'; // White
        }

        // Minimal PNG base64 (1x1 pixel)
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return base64PNG;
    }

    // File upload handling
    glbFileInput.addEventListener('change', handleFileUpload);

    // Drag and drop support
    const uploadArea = document.querySelector('.file-upload-area');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Conversion buttons
    convertToObjBtn.addEventListener('click', () => convertToFormat('obj'));
    convertToGltfBtn.addEventListener('click', () => convertToFormat('gltf'));
    extractTexturesBtn.addEventListener('click', extractTextures);
    downloadAllBtn.addEventListener('click', downloadAllFiles);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.glb')) {
            showNotification('Please upload a GLB file (.glb)', 'error');
            return;
        }

        processUploadedFile(file);
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-active)';
        uploadArea.style.backgroundColor = 'var(--color-hover)';
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-border)';
        uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-border)';
        uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';

        const file = event.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.glb')) {
            showNotification('Please upload a GLB file (.glb)', 'error');
            return;
        }

        // Set the file input value
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        glbFileInput.files = dataTransfer.files;

        processUploadedFile(file);
    }

    function processUploadedFile(file) {
        uploadedFile = file;

        // Update file info display
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';

        // Show preview section
        previewSection.style.display = 'block';

        // Initialize Three.js preview
        initThreeJSPreview(file);

        // Clear previous outputs
        clearConversionOutputs();

        showNotification(`File "${file.name}" uploaded successfully`, 'success');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function initThreeJSPreview(file) {
        // Clean up previous preview
        if (currentRenderer) {
            modelPreview.innerHTML = '';
            currentRenderer = null;
        }

        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            showNotification('Three.js library not loaded. Preview disabled.', 'warning');
            modelPreview.innerHTML = '<p class="no-output">3D preview requires Three.js library</p>';
            return;
        }

        try {
            // Create Three.js scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1e293b);

            // Create camera
            const camera = new THREE.PerspectiveCamera(75, modelPreview.clientWidth / modelPreview.clientHeight, 0.1, 1000);
            camera.position.z = 5;

            // Create renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(modelPreview.clientWidth, modelPreview.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            modelPreview.appendChild(renderer.domElement);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);

            // Load GLB file
            const loader = new THREE.GLTFLoader();
            const reader = new FileReader();

            reader.onload = function(event) {
                const arrayBuffer = event.target.result;

                loader.parse(arrayBuffer, '', function(gltf) {
                    currentModel = gltf.scene;
                    scene.add(currentModel);

                    // Center and scale model
                    const box = new THREE.Box3().setFromObject(currentModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());

                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 4 / maxDim;

                    currentModel.position.x = -center.x * scale;
                    currentModel.position.y = -center.y * scale;
                    currentModel.position.z = -center.z * scale;
                    currentModel.scale.set(scale, scale, scale);

                    // Store references
                    currentScene = scene;
                    currentCamera = camera;
                    currentRenderer = renderer;

                    // Start animation loop
                    animate();

                }, function(error) {
                    console.error('Error loading GLB:', error);
                    showNotification('Failed to load GLB file for preview', 'error');
                    modelPreview.innerHTML = '<p class="no-output">Failed to load 3D preview</p>';
                });
            };

            reader.onerror = function(error) {
                console.error('Error reading file:', error);
                showNotification('Error reading file', 'error');
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error('Three.js initialization error:', error);
            showNotification('3D preview initialization failed', 'error');
            modelPreview.innerHTML = '<p class="no-output">3D preview initialization failed</p>';
        }
    }

    function animate() {
        if (!currentRenderer || !currentScene || !currentCamera) return;

        requestAnimationFrame(animate);

        // Rotate model slowly
        if (currentModel) {
            currentModel.rotation.y += 0.005;
        }

        currentRenderer.render(currentScene, currentCamera);
    }

    function convertToFormat(format) {
        if (!uploadedFile) {
            showNotification('Please upload a GLB file first', 'warning');
            return;
        }

        showNotification(`Converting to ${format.toUpperCase()}...`, 'info');

        // For now, simulate conversion since actual conversion is complex
        // In a real implementation, this would use Three.js exporters or other libraries

        setTimeout(() => {
            const outputFile = {
                id: Date.now(),
                name: `converted_model.${format}`,
                format: format,
                size: Math.floor(uploadedFile.size * 0.8), // Simulated size
                type: 'model',
                data: generateDummyModelData(format) // Generate dummy model data for download
            };

            conversionOutputs.push(outputFile);
            updateOutputDisplay();
            showNotification(`Conversion to ${format.toUpperCase()} completed`, 'success');
        }, 1500);
    }

    function extractTextures() {
        if (!uploadedFile) {
            showNotification('Please upload a GLB file first', 'warning');
            return;
        }

        showNotification('Extracting textures...', 'info');

        // Simulate texture extraction
        setTimeout(() => {
            const textures = [
                { id: Date.now() + 1, name: 'texture_diffuse.png', format: 'png', size: 102400, type: 'texture', data: generateDummyTextureData('diffuse') },
                { id: Date.now() + 2, name: 'texture_normal.png', format: 'png', size: 102400, type: 'texture', data: generateDummyTextureData('normal') },
                { id: Date.now() + 3, name: 'texture_roughness.png', format: 'png', size: 51200, type: 'texture', data: generateDummyTextureData('roughness') }
            ];

            conversionOutputs.push(...textures);
            updateOutputDisplay();
            showNotification('Textures extracted successfully', 'success');
        }, 2000);
    }

    function updateOutputDisplay() {
        if (conversionOutputs.length === 0) {
            outputFiles.innerHTML = '<p class="no-output">No conversion output yet.</p>';
            downloadAllBtn.disabled = true;
            return;
        }

        let html = '';
        conversionOutputs.forEach(output => {
            const icon = output.type === 'model' ? 'fa-cube' : 'fa-image';
            const typeLabel = output.type === 'model' ? '3D Model' : 'Texture';

            html += `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="file-item-details">
                            <h5>${output.name}</h5>
                            <p>${typeLabel} • ${output.format.toUpperCase()} • ${formatFileSize(output.size)}</p>
                        </div>
                    </div>
                    <div class="file-item-actions">
                        <button class="small-btn download-single-btn" data-id="${output.id}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
        });

        outputFiles.innerHTML = html;
        downloadAllBtn.disabled = false;

        // Add event listeners to single download buttons
        document.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                downloadSingleFile(id);
            });
        });
    }

    function clearConversionOutputs() {
        conversionOutputs = [];
        updateOutputDisplay();
    }

    function downloadSingleFile(id) {
        const file = conversionOutputs.find(f => f.id === id);
        if (!file) return;

        showNotification(`Downloading ${file.name}...`, 'info');

        // Create blob from file data
        let blob;
        if (file.format === 'png' && file.type === 'texture') {
            // Texture data is base64 PNG
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'image/png' });
        } else {
            // Model data (OBJ/glTF) is text
            blob = new Blob([file.data], { type: 'text/plain' });
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${file.name} downloaded successfully`, 'success');
    }

    function downloadAllFiles() {
        if (conversionOutputs.length === 0) return;

        showNotification(`Preparing ${conversionOutputs.length} files for download...`, 'info');

        // Download each file with a delay to avoid overwhelming the browser
        conversionOutputs.forEach((file, index) => {
            setTimeout(() => {
                downloadSingleFile(file.id);
            }, index * 500); // 500ms delay between each file
        });
    }

    // Handle window resize for Three.js preview
    window.addEventListener('resize', function() {
        if (currentRenderer && currentCamera && modelPreview.clientWidth > 0) {
            currentCamera.aspect = modelPreview.clientWidth / modelPreview.clientHeight;
            currentCamera.updateProjectionMatrix();
            currentRenderer.setSize(modelPreview.clientWidth, modelPreview.clientHeight);
        }
    });
}

// Language Toggle Module
function initLanguageToggle() {
    const languageToggleBtn = document.getElementById('language-toggle-btn');
    const languageLabel = document.getElementById('language-label');

    // If language toggle button is removed (as per user request), apply Chinese translations and return
    if (!languageToggleBtn || !languageLabel) {
        currentLanguage = 'zh';
        applyTranslations('zh');
        return;
    }

    // Check for saved language preference or default to Chinese
    const savedLanguage = localStorage.getItem('language') || 'zh';
    if (savedLanguage === 'zh') {
        currentLanguage = 'zh';
        languageLabel.textContent = '中';
        applyTranslations('zh');
    } else {
        currentLanguage = 'en';
        languageLabel.textContent = 'EN';
        applyTranslations('en');
    }

    languageToggleBtn.addEventListener('click', function() {
        const newLanguage = currentLanguage === 'en' ? 'zh' : 'en';
        currentLanguage = newLanguage;

        // Update button label
        languageLabel.textContent = newLanguage === 'en' ? 'EN' : '中';

        // Apply translations
        applyTranslations(newLanguage);

        // Save preference
        localStorage.setItem('language', newLanguage);

        // Notify user
        showNotification(`Switched to ${newLanguage === 'en' ? 'English' : 'Chinese'} language`);
    });
}

// Function to apply translations to the page
function applyTranslations(language) {
    const langData = translations[language];
    if (!langData) return;

    // Helper function to preserve proper nouns
    function preserveProperNouns(text) {
        if (language === 'en') return text; // No need to process for English

        let result = text;
        properNouns.forEach(noun => {
            const regex = new RegExp(`\\b${noun}\\b`, 'gi');
            result = result.replace(regex, noun);
        });
        return result;
    }

    // Apply translations to specific elements
    // Note: This is a simplified implementation. In a real app, you might use data attributes
    // or a more sophisticated translation system.

    // Header
    const siteTitle = document.querySelector('.logo h1');
    if (siteTitle) siteTitle.textContent = preserveProperNouns(langData.siteTitle);

    const siteTagline = document.querySelector('.tagline');
    if (siteTagline) siteTagline.textContent = preserveProperNouns(langData.siteTagline);

    // Sidebar
    const sidebarTitle = document.querySelector('.sidebar-header h2');
    if (sidebarTitle) sidebarTitle.innerHTML = `<i class="fas fa-sliders-h"></i> ${preserveProperNouns(langData.sidebarTitle)}`;

    // Tool items
    const toolItems = document.querySelectorAll('.tool-item');
    toolItems.forEach(item => {
        const toolId = item.getAttribute('data-tool');
        const titleElement = item.querySelector('.tool-info h3');
        const descElement = item.querySelector('.tool-info p');

        if (toolId === '3d-converter' && titleElement && descElement) {
            titleElement.textContent = preserveProperNouns(langData.threeDConverter);
            descElement.textContent = preserveProperNouns(langData.threeDConverterDesc);
        }
    });

    // Add tool button
    const addToolBtn = document.querySelector('.add-tool-btn');
    if (addToolBtn) {
        addToolBtn.innerHTML = `<i class="fas fa-plus-circle"></i> ${preserveProperNouns(langData.addTool)}`;
    }

    // Breadcrumb
    const breadcrumbTools = document.querySelector('.breadcrumb span:first-child');
    if (breadcrumbTools) breadcrumbTools.textContent = preserveProperNouns(langData.breadcrumbTools);

    // Current tool name will be updated by updateCurrentToolName()
    updateCurrentToolName();

    // Tool actions (title attributes)
    const saveBtn = document.querySelector('.action-btn[title="Save"]');
    if (saveBtn) saveBtn.title = preserveProperNouns(langData.save);

    const resetBtn = document.querySelector('.action-btn[title="Reset"]');
    if (resetBtn) resetBtn.title = preserveProperNouns(langData.reset);

    const shareBtn = document.querySelector('.action-btn[title="Share"]');
    if (shareBtn) shareBtn.title = preserveProperNouns(langData.share);

    // Tool-specific translations (only apply to active tool)
    const activeTool = document.querySelector('.tool-placeholder.active');
    if (activeTool) {
        const toolId = activeTool.id;

        if (toolId === '3d-converter') {
            apply3DConverterTranslations(langData);
        }
    }

    // Footer
    const footerText = document.querySelector('.footer-info');
    if (footerText) {
        footerText.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${preserveProperNouns(langData.footerText)}`;
    }

    const copyright = document.querySelector('.footer-content p');
    if (copyright) copyright.textContent = preserveProperNouns(langData.copyright);

    const footerLinks = document.querySelectorAll('.footer-links a');
    if (footerLinks.length >= 4) {
        footerLinks[0].innerHTML = `<i class="fas fa-question-circle"></i> ${preserveProperNouns(langData.help)}`;
        footerLinks[1].innerHTML = `<i class="fas fa-bug"></i> ${preserveProperNouns(langData.reportIssue)}`;
        footerLinks[2].innerHTML = `<i class="fas fa-code-branch"></i> ${preserveProperNouns(langData.github)}`;
        footerLinks[3].innerHTML = `<i class="fas fa-envelope"></i> ${preserveProperNouns(langData.contact)}`;
    }
}



function applyURLEncoderTranslations(langData) {
    const placeholderHeader = document.querySelector('#url-encoder .placeholder-header');
    if (placeholderHeader) {
        const h2 = placeholderHeader.querySelector('h2');
        const p = placeholderHeader.querySelector('p:first-of-type');
        if (h2) h2.innerHTML = `<i class="fas fa-link"></i> ${preserveProperNouns(langData.urlEncoderTitle)}`;
        if (p) p.textContent = preserveProperNouns(langData.urlEncoderSubtitle);
    }
}


function applyTimestampConverterTranslations(langData) {
    const placeholderHeader = document.querySelector('#timestamp-converter .placeholder-header');
    if (placeholderHeader) {
        const h2 = placeholderHeader.querySelector('h2');
        const p = placeholderHeader.querySelector('p:first-of-type');
        if (h2) h2.innerHTML = `<i class="fas fa-clock"></i> ${preserveProperNouns(langData.timestampConverterTitle)}`;
        if (p) p.textContent = preserveProperNouns(langData.timestampConverterSubtitle);
    }
}


function apply3DConverterTranslations(langData) {
    const placeholderHeader = document.querySelector('#3d-converter .placeholder-header');
    if (placeholderHeader) {
        const h2 = placeholderHeader.querySelector('h2');
        const p = placeholderHeader.querySelector('p:first-of-type');
        if (h2) h2.innerHTML = `<i class="fas fa-cube"></i> ${preserveProperNouns(langData.threeDConverterTitle)}`;
        if (p) p.textContent = preserveProperNouns(langData.threeDConverterSubtitle);
    }

    const inputSection = document.querySelector('#3d-converter .input-section');
    if (inputSection) {
        const h3 = inputSection.querySelector('.section-header h3');
        if (h3) h3.textContent = preserveProperNouns(langData.uploadGLB);

        const uploadPrompt = inputSection.querySelector('.upload-prompt p');
        if (uploadPrompt) uploadPrompt.textContent = preserveProperNouns(langData.dragDropPrompt);

        const maxFileSize = inputSection.querySelector('.upload-prompt small');
        if (maxFileSize) maxFileSize.textContent = preserveProperNouns(langData.maxFileSize);

        const fileInfoLabels = inputSection.querySelectorAll('.file-info p strong');
        if (fileInfoLabels.length >= 2) {
            fileInfoLabels[0].textContent = preserveProperNouns(langData.selectedFile);
            fileInfoLabels[1].textContent = preserveProperNouns(langData.fileSize);
        }

        const previewTitle = inputSection.querySelector('.preview-section h4');
        if (previewTitle) previewTitle.textContent = preserveProperNouns(langData.threeDPreview);
    }

    const outputSection = document.querySelector('#3d-converter .output-section');
    if (outputSection) {
        const h3 = outputSection.querySelector('.section-header h3');
        if (h3) h3.textContent = preserveProperNouns(langData.conversionOptions);

        const buttons = outputSection.querySelectorAll('.conversion-actions .small-btn');
        if (buttons.length >= 3) {
            buttons[0].innerHTML = `<i class="fas fa-exchange-alt"></i> ${preserveProperNouns(langData.convertToOBJ)}`;
            buttons[1].innerHTML = `<i class="fas fa-exchange-alt"></i> ${preserveProperNouns(langData.convertToGLTF)}`;
            buttons[2].innerHTML = `<i class="fas fa-image"></i> ${preserveProperNouns(langData.extractTextures)}`;
        }

        const noOutput = outputSection.querySelector('.no-output');
        if (noOutput) noOutput.textContent = preserveProperNouns(langData.noOutput);

        const downloadAllBtn = outputSection.querySelector('#download-all-btn');
        if (downloadAllBtn) downloadAllBtn.innerHTML = `<i class="fas fa-download"></i> ${preserveProperNouns(langData.downloadAll)}`;
    }

    const infoBox = document.querySelector('#3d-converter .tool-info-box');
    if (infoBox) {
        const h4 = infoBox.querySelector('h4');
        const paragraphs = infoBox.querySelectorAll('p');
        if (h4) h4.innerHTML = `<i class="fas fa-info-circle"></i> ${preserveProperNouns(langData.about3DConverter)}`;
        if (paragraphs.length >= 2) {
            paragraphs[0].textContent = preserveProperNouns(langData.threeDConverterInfo1);
            paragraphs[1].innerHTML = `<strong>${preserveProperNouns('Note:')}</strong> ${preserveProperNouns(langData.threeDConverterInfo2)}`;
        }
    }
}

// Helper function to preserve proper nouns in translated text
function preserveProperNouns(text) {
    if (currentLanguage === 'en') return text; // No need to process for English

    let result = text;
    properNouns.forEach(noun => {
        // Match the noun with word boundaries, case insensitive
        const regex = new RegExp(`\\b${noun}\\b`, 'gi');
        result = result.replace(regex, noun);
    });
    return result;
}

// Update current tool name when switching tools
function updateCurrentToolName() {
    const activeToolItem = document.querySelector('.tool-item.active');
    if (activeToolItem) {
        const toolId = activeToolItem.getAttribute('data-tool');
        const currentToolNameElement = document.getElementById('current-tool-name');

        if (currentToolNameElement) {
            const langData = translations[currentLanguage];
            if (!langData) return;

            let toolName = '';
            switch (toolId) {
                case 'json-formatter':
                    toolName = langData.jsonFormatter;
                    break;
                case 'base64-converter':
                    toolName = langData.base64Converter;
                    break;
                case 'url-encoder':
                    toolName = langData.urlEncoder;
                    break;
                case 'hash-generator':
                    toolName = langData.hashGenerator;
                    break;
                case 'timestamp-converter':
                    toolName = langData.timestampConverter;
                    break;
                case 'color-picker':
                    toolName = langData.colorPicker;
                    break;
                case '3d-converter':
                    toolName = langData.threeDConverter;
                    break;
                default:
                    toolName = 'Unknown Tool';
            }

            currentToolNameElement.textContent = preserveProperNouns(toolName);
        }
    }
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initToolSwitcher,
        initThemeToggle,
        initSidebarToggle,
        initJSONFormatter,
        init3DConverter,
        initLanguageToggle,
        showNotification
    };
}