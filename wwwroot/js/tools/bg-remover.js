function initBgRemover() {
    console.log('Initializing Background Remover Tool');

    const imageInput = document.getElementById('bgrem-image-input');
    const fileInfo = document.getElementById('bgrem-file-info');
    const fileCountEl = document.getElementById('bgrem-file-count');
    const totalSizeEl = document.getElementById('bgrem-total-size');
    const bgFillSelect = document.getElementById('bgrem-bg-fill');
    const removeBtn = document.getElementById('bgrem-remove-btn');
    const resetBtn = document.getElementById('bgrem-reset-btn');
    const downloadAllBtn = document.getElementById('bgrem-download-all-btn');
    const outputFiles = document.getElementById('bgrem-output-files');
    const previewSection = document.getElementById('bgrem-preview-section');
    const originalPreviewImg = document.querySelector('#bgrem-original-preview img');
    const originalPreviewDims = document.querySelector('#bgrem-original-preview .preview-dimensions');
    const resultPreviewImg = document.querySelector('#bgrem-result-preview img');
    const resultPreviewDims = document.querySelector('#bgrem-result-preview .preview-dimensions');
    const originalPreview = document.getElementById('bgrem-original-preview');
    const resultPreview = document.getElementById('bgrem-result-preview');
    const progressBar = document.getElementById('bgrem-progress-bar');
    const progressText = document.getElementById('bgrem-progress-text');
    const progressContainer = document.getElementById('bgrem-progress-container');

    let uploadedImages = [];
    let processedImages = [];

    function isLocalHost() {
        const h = location.hostname;
        return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.startsWith('192.168.') || h.startsWith('10.');
    }

    if (!isLocalHost()) {
        removeBtn.disabled = true;
        removeBtn.title = '此功能仅限本地使用';
        const b = document.createElement('div');
        b.style.cssText = 'color:var(--color-accent-red);font-weight:600;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid var(--color-accent-red);border-radius:var(--radius-sm);margin-bottom:var(--spacing-md);text-align:center;';
        b.innerHTML = '<i class="fas fa-exclamation-triangle"></i> AI 去背景仅支持本地使用（localhost），请双击 start.bat 后在本地浏览器打开。';
        const header = document.querySelector('#bg-remover .placeholder-header');
        if (header) header.parentNode.insertBefore(b, header.nextSibling);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function cleanFileName(filename) {
        if (!filename) return '';
        const name = filename.replace(/\.[^/.]+$/, '');
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    }

    function processImageUpload(files) {
        uploadedImages.forEach(img => { if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url); });
        processedImages.forEach(r => { if (r && r.previewUrl && r.previewUrl.startsWith('blob:')) URL.revokeObjectURL(r.previewUrl); });
        uploadedImages = []; processedImages = [];
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) { showNotification('请上传图片文件', 'warning'); return; }
        Promise.all(imageFiles.map(file => new Promise((resolve, reject) => {
            const img = new Image(); const url = URL.createObjectURL(file);
            img.onload = () => resolve({ file, width: img.width, height: img.height, url, element: img });
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`无法加载图片: ${file.name}`)); };
            img.src = url;
        }))).then(images => {
            uploadedImages = images; processedImages = new Array(images.length).fill(null);
            const totalSize = images.reduce((s, i) => s + i.file.size, 0);
            fileCountEl.textContent = images.length; totalSizeEl.textContent = formatFileSize(totalSize);
            fileInfo.style.display = 'block';
            updatePreview(); updateOutputDisplay();
            showNotification(`成功上传 ${images.length} 张图片`, 'success');
        }).catch(e => showNotification(`图片加载失败: ${e.message}`, 'error'));
    }

    function applyBackground(imageDataUrl, bgColor) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
                const ctx = c.getContext('2d');
                ctx.fillStyle = bgColor; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
                c.toBlob(b => resolve(b), 'image/png');
            };
            img.src = imageDataUrl;
        });
    }

    async function removeAllBackgrounds() {
        if (uploadedImages.length === 0) { showNotification('请先上传图片', 'warning'); return; }
        removeBtn.disabled = true; resetBtn.disabled = true;
        progressContainer.style.display = 'block'; progressBar.style.width = '0%';
        progressText.textContent = '正在加载模型...';
        try {
            const bgFill = bgFillSelect.value;
            const total = uploadedImages.length;
            let completed = 0;
            for (let i = 0; i < uploadedImages.length; i++) {
                const imgData = uploadedImages[i];
                progressText.textContent = `正在处理: ${imgData.file.name} (${i + 1}/${total})`;
                progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
                try {
                    const resultBlob = await window.__rmbg14.removeBackground(imgData.file);
                    const resultUrl = URL.createObjectURL(resultBlob);
                    const resultImg = new Image();
                    await new Promise((resolve, reject) => { resultImg.onload = resolve; resultImg.onerror = reject; resultImg.src = resultUrl; });
                    let finalBlob = resultBlob, finalUrl = resultUrl;
                    let finalWidth = resultImg.width, finalHeight = resultImg.height;
                    if (bgFill !== 'none') {
                        const bgColor = bgFill === 'white' ? '#FFFFFF' : '#000000';
                        finalBlob = await applyBackground(resultUrl, bgColor);
                        finalUrl = URL.createObjectURL(finalBlob);
                        URL.revokeObjectURL(resultUrl);
                    }
                    if (processedImages[i] && processedImages[i].previewUrl) URL.revokeObjectURL(processedImages[i].previewUrl);
                    processedImages[i] = {
                        name: cleanFileName(imgData.file.name) + '_nobg.png',
                        size: finalBlob.size, blob: finalBlob, previewUrl: finalUrl,
                        width: finalWidth, height: finalHeight
                    };
                } catch (err) {
                    console.error(`处理失败: ${imgData.file.name}`, err);
                    showNotification(`处理失败: ${err.message || err}`, 'error');
                }
                completed++;
                progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
            }
            progressText.textContent = `完成: ${processedImages.filter(i => i !== null).length}/${total} 张`;
            updatePreview(); updateOutputDisplay();
            showNotification(`处理完成: ${processedImages.filter(i => i !== null).length}/${total} 张图片`, 'success');
        } catch (err) {
            console.error('模型加载失败:', err);
            showNotification('AI 模型加载失败，请刷新页面后重试', 'error');
        } finally {
            removeBtn.disabled = false; resetBtn.disabled = false;
            setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
        }
    }

    function updatePreview() {
        if (uploadedImages.length === 0) { previewSection.style.display = 'none'; return; }
        const first = uploadedImages[0];
        originalPreviewImg.src = first.url;
        originalPreviewDims.textContent = `${first.width}×${first.height}`;
        const result = processedImages[0];
        if (result) { resultPreviewImg.src = result.previewUrl; resultPreviewDims.textContent = `${result.width}×${result.height}`; }
        else { resultPreviewImg.src = ''; resultPreviewDims.textContent = '等待处理'; }
        previewSection.style.display = 'block';
        enablePreviewZoom(originalPreview);
        enablePreviewZoom(resultPreview);
    }

    function resetAll() {
        if (processedImages.every(i => i === null)) { showNotification('没有可重置的图片', 'warning'); return; }
        processedImages.forEach(r => { if (r && r.previewUrl) URL.revokeObjectURL(r.previewUrl); });
        processedImages = new Array(uploadedImages.length).fill(null);
        updatePreview(); updateOutputDisplay();
        showNotification('已重置全部图片', 'info');
    }

    function updateOutputDisplay() {
        const done = processedImages.filter(i => i !== null);
        if (done.length === 0) { outputFiles.innerHTML = '<p class="no-output">暂无处理输出。</p>'; downloadAllBtn.disabled = true; return; }
        outputFiles.innerHTML = '';
        for (let i = 0; i < uploadedImages.length; i++) {
            const r = processedImages[i]; if (!r) continue;
            const item = document.createElement('div'); item.className = 'output-item';
            item.innerHTML = `<div class="output-item-info"><i class="fas fa-image"></i><span class="output-item-name">${r.name}</span><span class="output-item-size">${formatFileSize(r.size)}</span><span class="output-item-dims">${r.width}×${r.height}</span></div><button class="small-btn download-single-btn" data-index="${i}"><i class="fas fa-download"></i> 下载</button>`;
            outputFiles.appendChild(item);
        }
        downloadAllBtn.disabled = false;
        document.querySelectorAll('#bgrem-output-files .download-single-btn').forEach(btn => {
            btn.addEventListener('click', function() { downloadSingleImage(parseInt(this.getAttribute('data-index'))); });
        });
    }

    function downloadSingleImage(idx) {
        const r = processedImages[idx]; if (!r) return;
        const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = r.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function downloadAllProcessed() {
        const done = processedImages.filter(i => i !== null);
        if (done.length === 0) { showNotification('没有可下载的处理结果', 'warning'); return; }
        showNotification(`正在下载 ${done.length} 张图片...`, 'info');
        done.forEach((r, i) => setTimeout(() => {
            const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = r.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, i * 200));
    }

    imageInput.addEventListener('change', function() { if (this.files.length > 0) processImageUpload(this.files); });
    removeBtn.addEventListener('click', removeAllBackgrounds);
    resetBtn.addEventListener('click', resetAll);
    downloadAllBtn.addEventListener('click', downloadAllProcessed);

    const uploadArea = document.querySelector('#bg-remover .file-upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); uploadArea.style.borderColor = 'var(--color-active)'; uploadArea.style.backgroundColor = 'var(--color-hover)'; });
        uploadArea.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); uploadArea.style.borderColor = 'var(--color-border)'; uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)'; });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault(); e.stopPropagation();
            uploadArea.style.borderColor = 'var(--color-border)'; uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const dt = new DataTransfer(); for (let i = 0; i < files.length; i++) dt.items.add(files[i]);
                imageInput.files = dt.files; processImageUpload(files);
            }
        });
    }

    window.addEventListener('beforeunload', () => {
        uploadedImages.forEach(i => { if (i.url && i.url.startsWith('blob:')) URL.revokeObjectURL(i.url); });
        processedImages.forEach(r => { if (r && r.previewUrl && r.previewUrl.startsWith('blob:')) URL.revokeObjectURL(r.previewUrl); });
    });
}
