function initBgRemover() {
    console.log('Initializing Background Remover Tool');

    const imageInput = document.getElementById('bgrem-image-input');
    const fileInfo = document.getElementById('bgrem-file-info');
    const fileCountEl = document.getElementById('bgrem-file-count');
    const totalSizeEl = document.getElementById('bgrem-total-size');
    const outputTypeSelect = document.getElementById('bgrem-output-type');
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
    const progressBar = document.getElementById('bgrem-progress-bar');
    const progressText = document.getElementById('bgrem-progress-text');
    const progressContainer = document.getElementById('bgrem-progress-container');

    let uploadedImages = [];
    let processedImages = [];

    function getLibrary() {
        return window.__bgRemovalLib;
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

    function getProcessFn(lib, outputType) {
        switch (outputType) {
            case 'mask':
                return lib.segmentForeground || lib.alphamask;
            case 'background':
                return lib.removeForeground;
            case 'foreground':
            default:
                return lib.removeBackground;
        }
    }

    function processImageUpload(files) {
        uploadedImages.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            }
        });
        processedImages.forEach(result => {
            if (result && result.previewUrl && result.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(result.previewUrl);
            }
        });

        uploadedImages = [];
        processedImages = [];

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showNotification('请上传图片文件', 'warning');
            return;
        }

        const imagePromises = imageFiles.map(file => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    resolve({
                        file,
                        width: img.width,
                        height: img.height,
                        url: url,
                        element: img
                    });
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error(`无法加载图片: ${file.name}`));
                };
                img.src = url;
            });
        });

        Promise.all(imagePromises)
            .then(images => {
                uploadedImages = images;
                processedImages = new Array(images.length).fill(null);

                const totalSize = images.reduce((sum, img) => sum + img.file.size, 0);
                fileCountEl.textContent = images.length;
                totalSizeEl.textContent = formatFileSize(totalSize);
                fileInfo.style.display = 'block';

                updatePreview();
                updateOutputDisplay();
                showNotification(`成功上传 ${images.length} 张图片`, 'success');
            })
            .catch(error => {
                showNotification(`图片加载失败: ${error.message}`, 'error');
            });
    }

    function applyBackground(imageDataUrl, bgColor) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(blob => resolve(blob), 'image/png');
            };
            img.src = imageDataUrl;
        });
    }

    const publicPath = new URL('./wwwroot/lib/bg-removal/dist/', location.href).href;

    async function removeAllBackgrounds() {
        if (uploadedImages.length === 0) {
            showNotification('请先上传图片', 'warning');
            return;
        }

        removeBtn.disabled = true;
        resetBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '正在加载模型...';

        try {
            const lib = getLibrary();
            if (!lib) {
                throw new Error('库未加载');
            }

            const outputType = outputTypeSelect.value;
            const bgFill = bgFillSelect.value;
            const processFn = getProcessFn(lib, outputType);
            const total = uploadedImages.length;
            let completed = 0;

            for (let i = 0; i < uploadedImages.length; i++) {
                const imgData = uploadedImages[i];

                progressText.textContent = `正在处理: ${imgData.file.name} (${i + 1}/${total})`;
                progressBar.style.width = `${Math.round((completed / total) * 100)}%`;

                try {
                    const resultBlob = await processFn(imgData.file, {
                        publicPath: publicPath,
                        model: 'isnet_fp16',
                        device: 'cpu',
                        proxyToWorker: false,
                        output: {
                            format: 'image/png'
                        }
                    });

                    const resultUrl = URL.createObjectURL(resultBlob);
                    const resultImg = new Image();
                    await new Promise((resolve, reject) => {
                        resultImg.onload = resolve;
                        resultImg.onerror = reject;
                        resultImg.src = resultUrl;
                    });

                    let finalBlob = resultBlob;
                    let finalUrl = resultUrl;
                    let finalWidth = resultImg.width;
                    let finalHeight = resultImg.height;

                    if (outputType === 'foreground' && bgFill !== 'none') {
                        const bgColor = bgFill === 'white' ? '#FFFFFF' : '#000000';
                        finalBlob = await applyBackground(resultUrl, bgColor);
                        finalUrl = URL.createObjectURL(finalBlob);
                        URL.revokeObjectURL(resultUrl);
                    }

                    if (processedImages[i] && processedImages[i].previewUrl) {
                        URL.revokeObjectURL(processedImages[i].previewUrl);
                    }

                    const cleanName = cleanFileName(imgData.file.name);
                    processedImages[i] = {
                        name: cleanName + '_nobg.png',
                        size: finalBlob.size,
                        blob: finalBlob,
                        previewUrl: finalUrl,
                        width: finalWidth,
                        height: finalHeight
                    };

                } catch (err) {
                    console.error(`处理失败: ${imgData.file.name}`, err);
                    showNotification(`处理失败: ${err.message || err}`, 'error');
                }

                completed++;
                progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
            }

            progressBar.style.width = '100%';
            progressText.textContent = `完成: ${processedImages.filter(i => i !== null).length}/${total} 张`;

            updatePreview();
            updateOutputDisplay();
            showNotification(`处理完成: ${processedImages.filter(i => i !== null).length}/${total} 张图片`, 'success');

        } catch (err) {
            console.error('模型加载失败:', err);
            showNotification('AI 模型加载失败，请刷新页面后重试', 'error');
        } finally {
            removeBtn.disabled = false;
            resetBtn.disabled = false;
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);
        }
    }

    function updatePreview() {
        if (uploadedImages.length === 0) {
            previewSection.style.display = 'none';
            return;
        }

        const firstImg = uploadedImages[0];
        originalPreviewImg.src = firstImg.url;
        originalPreviewDims.textContent = `${firstImg.width}×${firstImg.height}`;

        const firstResult = processedImages[0];
        if (firstResult) {
            resultPreviewImg.src = firstResult.previewUrl;
            resultPreviewDims.textContent = `${firstResult.width}×${firstResult.height}`;
        } else {
            resultPreviewImg.src = '';
            resultPreviewDims.textContent = '等待处理';
        }

        previewSection.style.display = 'block';
    }

    function resetAll() {
        if (processedImages.every(img => img === null)) {
            showNotification('没有可重置的图片', 'warning');
            return;
        }

        processedImages.forEach(result => {
            if (result && result.previewUrl) {
                URL.revokeObjectURL(result.previewUrl);
            }
        });

        processedImages = new Array(uploadedImages.length).fill(null);
        updatePreview();
        updateOutputDisplay();
        showNotification('已重置全部图片', 'info');
    }

    function updateOutputDisplay() {
        const processed = processedImages.filter(img => img !== null);
        if (processed.length === 0) {
            outputFiles.innerHTML = '<p class="no-output">暂无处理输出。</p>';
            downloadAllBtn.disabled = true;
            return;
        }

        outputFiles.innerHTML = '';
        for (let i = 0; i < uploadedImages.length; i++) {
            const result = processedImages[i];
            if (!result) continue;

            const item = document.createElement('div');
            item.className = 'output-item';
            item.innerHTML = `
                <div class="output-item-info">
                    <i class="fas fa-image"></i>
                    <span class="output-item-name">${result.name}</span>
                    <span class="output-item-size">${formatFileSize(result.size)}</span>
                    <span class="output-item-dims">${result.width}×${result.height}</span>
                </div>
                <button class="small-btn download-single-btn" data-index="${i}">
                    <i class="fas fa-download"></i> 下载
                </button>
            `;
            outputFiles.appendChild(item);
        }

        downloadAllBtn.disabled = processed.length === 0;

        document.querySelectorAll('#bgrem-output-files .download-single-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-index'));
                downloadSingleImage(idx);
            });
        });
    }

    function downloadSingleImage(index) {
        const result = processedImages[index];
        if (!result) return;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.blob);
        link.download = result.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function downloadAllProcessed() {
        const processed = processedImages.filter(img => img !== null);
        if (processed.length === 0) {
            showNotification('没有可下载的处理结果', 'warning');
            return;
        }

        showNotification(`正在下载 ${processed.length} 张图片...`, 'info');
        processed.forEach((result, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(result.blob);
                link.download = result.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            }, index * 200);
        });
    }

    imageInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            processImageUpload(this.files);
        }
    });

    removeBtn.addEventListener('click', removeAllBackgrounds);
    resetBtn.addEventListener('click', resetAll);
    downloadAllBtn.addEventListener('click', downloadAllProcessed);

    const uploadArea = document.querySelector('#bg-remover .file-upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(event) {
            event.preventDefault();
            event.stopPropagation();
            uploadArea.style.borderColor = 'var(--color-active)';
            uploadArea.style.backgroundColor = 'var(--color-hover)';
        });

        uploadArea.addEventListener('dragleave', function(event) {
            event.preventDefault();
            event.stopPropagation();
            uploadArea.style.borderColor = 'var(--color-border)';
            uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
        });

        uploadArea.addEventListener('drop', function(event) {
            event.preventDefault();
            event.stopPropagation();
            uploadArea.style.borderColor = 'var(--color-border)';
            uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                const dataTransfer = new DataTransfer();
                for (let i = 0; i < files.length; i++) {
                    dataTransfer.items.add(files[i]);
                }
                imageInput.files = dataTransfer.files;
                processImageUpload(files);
            }
        });
    }

    window.addEventListener('beforeunload', function() {
        uploadedImages.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            }
        });
        processedImages.forEach(result => {
            if (result && result.previewUrl && result.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(result.previewUrl);
            }
        });
    });
}

