// Roxami Web Tools - Main Application JavaScript
console.log('Roxami Web Tools JavaScript file loaded');

// Translation system
const translations = {

    zh: {
        // Header
        'siteTitle': 'Roxami Studio',
        'siteTagline': '网页工具集合',

        // Sidebar
        'sidebarTitle': '工具',
        'threeDConverter': '3D 转换器',
        'threeDConverterDesc': '转换 GLB 到 OBJ',
        'addTool': '添加工具',

        // Breadcrumb
        'breadcrumbTools': '工具',
        'currentTool': '3D 转换器',

        // Tool actions
        'save': '保存',
        'reset': '重置',

        // 3D Converter tool
        'threeDConverterTitle': '3D 模型转换器',
        'threeDConverterSubtitle': '将 GLB 文件转换为 OBJ 格式并提取纹理。',
        'uploadGLB': '上传 GLB 文件',
        'dragDropPrompt': '拖放 GLB 文件或点击浏览',
        'maxFileSize': '最大文件大小：50MB',
        'selectedFile': '已选文件：',
        'fileSize': '文件大小：',
        'threeDPreview': '3D 预览',
        'conversionOptions': '转换选项',
        'convertToOBJ': '转换为 OBJ',
        'extractTextures': '提取纹理',
        'filenamePrefix': '文件名前缀：',
        'filenamePrefixPlaceholder': '例如：my_model_',
        'noOutput': '尚无转换输出。',
        'downloadAll': '下载全部',
        'about3DConverter': '关于 3D 模型转换器',
        'threeDConverterInfo1': '此工具将 GLB 文件转换为 OBJ 格式。同时从 GLB 文件中提取嵌入的纹理。所有处理都在您的浏览器中使用 Three.js 库完成。',
        'threeDConverterInfo2': '注意：大文件可能需要更长时间处理。由于格式复杂性，不支持 FBX 转换。',

        // Video Frame Extractor tool
        'videoFrameExtractor': '视频帧提取器',
        'videoFrameExtractorDesc': '从视频提取序列帧',
        'videoFrameExtractorTitle': '视频帧提取器',
        'videoFrameExtractorSubtitle': '从视频文件提取序列帧图片，支持自定义帧数和透明通道。',
        'uploadVideo': '上传视频文件',
        'videoDragDropPrompt': '拖放视频文件或点击浏览',
        'videoFormats': '支持 MP4、WebM、AVI 等格式',
        'videoSelectedFile': '已选文件：',
        'videoFileSize': '文件大小：',
        'videoDuration': '视频时长：',
        'videoPreview': '视频预览',
        'extractionSettings': '提取设置',
        'fps': 'FPS (每秒帧数)：',
        'fpsPlaceholder': '例如：24',
        'totalFramesCalc': '计算总帧数：',
        'extractFrames': '提取帧',
        'downloadAllFrames': '全部下载',
        'clearFrames': '清空列表',
        'noFramesOutput': '暂无提取输出。',
        'aboutVideoFrameExtractor': '关于视频帧提取器',
        'videoFrameExtractorInfo1': '此工具从视频文件中提取序列帧图片。您可以设置 FPS（每秒帧数），工具会根据视频时长自动计算总帧数。导出的图片为 PNG 格式并保留透明通道（如果视频支持）。所有处理均在您的浏览器中完成，视频数据不会发送到服务器。',
        'videoFrameExtractorInfo2': '注意：处理时间取决于视频长度和设置的 FPS。支持大多数现代视频格式。',

        // File Renamer tool
        'fileRenamer': '文件重命名工具',
        'fileRenamerDesc': '批量重命名文件',
        'fileRenamerTitle': '文件重命名工具',
        'fileRenamerSubtitle': '批量重命名文件夹中的文件，支持按名称或时间排序。',
        'selectFolder': '选择文件夹',
        'folderDragDropPrompt': '选择文件夹',
        'folderFormats': '将处理文件夹中的所有文件',
        'selectedFolder': '已选文件夹：',
        'fileCount': '文件数量：',
        'totalSize': '总大小：',
        'fileListPreview': '文件列表预览',
        'renameSettings': '重命名设置',
        'sortMethod': '排序方式：',
        'startIndex': '起始编号：',
        'digits': '编号位数：',
        'previewRename': '预览重命名',
        'executeRename': '执行重命名',
        'downloadRenamed': '下载重命名后文件',
        'noRenameOutput': '暂无重命名结果。',
        'aboutFileRenamer': '关于文件重命名工具',
        'fileRenamerInfo1': '此工具批量重命名文件夹中的文件。您可以按照文件名或修改时间对文件进行排序，并按照指定前缀和编号格式重命名文件。所有处理均在您的浏览器中完成，文件数据不会发送到服务器。',
        'fileRenamerInfo2': '注意：由于浏览器安全限制，重命名操作仅生成重命名后的文件下载，不会修改原始文件。请下载重命名后的文件到本地。',

        // Footer
        'footerText': '所有处理均在您的浏览器中进行。数据不会发送到服务器。',
        'copyright': '© 2026 Roxami Studio',
        'help': '帮助',
        'reportIssue': '报告问题',
        'github': 'GitHub',
        'contact': '联系'
    }
};

// List of proper nouns that should not be translated (case insensitive)
const properNouns = [
    'JSON', 'Base64', 'URL', 'MD5', 'SHA', 'GLB', 'OBJ', 'FBX',
    'Three.js', 'Roxami', 'GitHub', 'HTML', 'CSS', 'JavaScript',
    'MP4', 'WebM', 'AVI', 'PNG'
];

// Current language
let currentLanguage = 'zh';

// Global error handler for debugging
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    console.error('Error message:', event.message);
    console.error('Error filename:', event.filename);
    console.error('Error lineno:', event.lineno);
    console.error('Error colno:', event.colno);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Roxami Web Tools loaded');

    // Initialize all modules
    initToolSwitcher();
    initThemeToggle();
    initSidebarToggle();
    initResponsiveBehavior();
    init3DConverter();
    initVideoFrameExtractor();
    initFileRenamer();
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
                        case 'video-frame-extractor':
                            applyVideoFrameExtractorTranslations(langData);
                            break;
                        case 'file-renamer':
                            applyFileRenamerTranslations(langData);
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
    if (!themeToggleBtn) return;

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
    if (!sidebarToggle) return;

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


// Responsive Behavior Module - Desktop only
function initResponsiveBehavior() {
    // For desktop only - ensure mobile classes are removed
    document.body.classList.remove('sidebar-mobile-hidden');

    // No mobile behavior needed
}

// Notification System
function showNotification(message, type = 'info') {
    console.log('showNotification called:', message, type);

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

    // Add styles only once
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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
        } else if (toolId === 'video-frame-extractor' && titleElement && descElement) {
            titleElement.textContent = preserveProperNouns(langData.videoFrameExtractor);
            descElement.textContent = preserveProperNouns(langData.videoFrameExtractorDesc);
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


    // Tool-specific translations (only apply to active tool)
    const activeTool = document.querySelector('.tool-placeholder.active');
    if (activeTool) {
        const toolId = activeTool.id;

        if (toolId === '3d-converter') {
            apply3DConverterTranslations(langData);
        } else if (toolId === 'video-frame-extractor') {
            applyVideoFrameExtractorTranslations(langData);
        } else if (toolId === 'file-renamer') {
            applyFileRenamerTranslations(langData);
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

        // Update filename prefix label and placeholder
        const prefixLabel = outputSection.querySelector('.filename-prefix-container label');
        if (prefixLabel && langData.filenamePrefix) {
            prefixLabel.innerHTML = `<i class="fas fa-tag"></i> ${preserveProperNouns(langData.filenamePrefix)}`;
        }

        const prefixInput = outputSection.querySelector('#filename-prefix-input');
        if (prefixInput && langData.filenamePrefixPlaceholder) {
            prefixInput.placeholder = preserveProperNouns(langData.filenamePrefixPlaceholder);
        }

        const buttons = outputSection.querySelectorAll('.conversion-actions .small-btn');
        if (buttons.length >= 2) {
            buttons[0].innerHTML = `<i class="fas fa-exchange-alt"></i> ${preserveProperNouns(langData.convertToOBJ)}`;
            buttons[1].innerHTML = `<i class="fas fa-image"></i> ${preserveProperNouns(langData.extractTextures)}`;
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

function applyVideoFrameExtractorTranslations(langData) {
    const placeholderHeader = document.querySelector('#video-frame-extractor .placeholder-header');
    if (placeholderHeader) {
        const h2 = placeholderHeader.querySelector('h2');
        const p = placeholderHeader.querySelector('p:first-of-type');
        if (h2) h2.innerHTML = `<i class="fas fa-video"></i> ${preserveProperNouns(langData.videoFrameExtractorTitle)}`;
        if (p) p.textContent = preserveProperNouns(langData.videoFrameExtractorSubtitle);
    }

    const inputSection = document.querySelector('#video-frame-extractor .input-section');
    if (inputSection) {
        const h3 = inputSection.querySelector('.section-header h3');
        if (h3) h3.textContent = preserveProperNouns(langData.uploadVideo);

        const uploadPrompt = inputSection.querySelector('.upload-prompt p');
        if (uploadPrompt) uploadPrompt.textContent = preserveProperNouns(langData.videoDragDropPrompt);

        const videoFormats = inputSection.querySelector('.upload-prompt small');
        if (videoFormats) videoFormats.textContent = preserveProperNouns(langData.videoFormats);

        const fileInfoLabels = inputSection.querySelectorAll('.file-info p strong');
        if (fileInfoLabels.length >= 3) {
            fileInfoLabels[0].textContent = preserveProperNouns(langData.videoSelectedFile);
            fileInfoLabels[1].textContent = preserveProperNouns(langData.videoFileSize);
            fileInfoLabels[2].textContent = preserveProperNouns(langData.videoDuration);
        }

        const previewTitle = inputSection.querySelector('.preview-section h4');
        if (previewTitle) previewTitle.textContent = preserveProperNouns(langData.videoPreview);
    }

    const outputSection = document.querySelector('#video-frame-extractor .output-section');
    if (outputSection) {
        const h3 = outputSection.querySelector('.section-header h3');
        if (h3) h3.textContent = preserveProperNouns(langData.extractionSettings);

        // Update filename prefix label and placeholder
        const prefixLabel = outputSection.querySelector('.filename-prefix-container label');
        if (prefixLabel && langData.filenamePrefix) {
            prefixLabel.innerHTML = `<i class="fas fa-tag"></i> ${preserveProperNouns(langData.filenamePrefix)}`;
        }

        const prefixInput = outputSection.querySelector('#frame-prefix-input');
        if (prefixInput && langData.filenamePrefixPlaceholder) {
            prefixInput.placeholder = preserveProperNouns(langData.filenamePrefixPlaceholder);
        }

        // Update FPS input placeholder
        const fpsInput = outputSection.querySelector('#fps-input');
        if (fpsInput && langData.fpsPlaceholder) {
            fpsInput.placeholder = preserveProperNouns(langData.fpsPlaceholder);
        }

        // Update FPS label
        const fpsLabel = outputSection.querySelector('.setting-row:first-of-type label');
        if (fpsLabel && langData.fps) {
            fpsLabel.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${preserveProperNouns(langData.fps)}`;
        }

        // Update total frames calculation label
        const totalFramesLabel = outputSection.querySelector('#frame-calc-row label');
        if (totalFramesLabel && langData.totalFramesCalc) {
            totalFramesLabel.innerHTML = `<i class="fas fa-calculator"></i> ${preserveProperNouns(langData.totalFramesCalc)}`;
        }

        const buttons = outputSection.querySelectorAll('.conversion-actions .small-btn');
        if (buttons.length >= 2) {
            buttons[0].innerHTML = `<i class="fas fa-play"></i> ${preserveProperNouns(langData.extractFrames)}`;
            buttons[1].innerHTML = `<i class="fas fa-download"></i> ${preserveProperNouns(langData.downloadAllFrames)}`;
        }

        const clearFramesBtn = outputSection.querySelector('#clear-frames-btn');
        if (clearFramesBtn && langData.clearFrames) {
            clearFramesBtn.innerHTML = `<i class="fas fa-trash"></i> ${preserveProperNouns(langData.clearFrames)}`;
        }

        const noOutput = outputSection.querySelector('.no-output');
        if (noOutput) noOutput.textContent = preserveProperNouns(langData.noFramesOutput);
    }

    const infoBox = document.querySelector('#video-frame-extractor .tool-info-box');
    if (infoBox) {
        const h4 = infoBox.querySelector('h4');
        const paragraphs = infoBox.querySelectorAll('p');
        if (h4) h4.innerHTML = `<i class="fas fa-info-circle"></i> ${preserveProperNouns(langData.aboutVideoFrameExtractor)}`;
        if (paragraphs.length >= 2) {
            paragraphs[0].textContent = preserveProperNouns(langData.videoFrameExtractorInfo1);
            paragraphs[1].innerHTML = `<strong>${preserveProperNouns('Note:')}</strong> ${preserveProperNouns(langData.videoFrameExtractorInfo2)}`;
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
                case 'video-frame-extractor':
                    toolName = langData.videoFrameExtractor;
                    break;
                case 'file-renamer':
                    toolName = langData.fileRenamer;
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
        initLanguageToggle,
        showNotification
    };
}