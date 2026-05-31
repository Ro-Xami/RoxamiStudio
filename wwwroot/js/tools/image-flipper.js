function initImageFlipper() {
    console.log('Initializing Image Flipper Tool');

    const imageInput = document.getElementById('flipper-image-input');
    const fileInfo = document.getElementById('flipper-file-info');
    const fileCountEl = document.getElementById('flipper-file-count');
    const totalSizeEl = document.getElementById('flipper-total-size');
    const flipXBtn = document.getElementById('flipper-flip-x-btn');
    const flipYBtn = document.getElementById('flipper-flip-y-btn');
    const flipXYBtn = document.getElementById('flipper-flip-xy-btn');
    const rotate90Btn = document.getElementById('flipper-rotate-90-btn');
    const rotate180Btn = document.getElementById('flipper-rotate-180-btn');
    const rotate270Btn = document.getElementById('flipper-rotate-270-btn');
    const resetBtn = document.getElementById('flipper-reset-btn');
    const downloadAllBtn = document.getElementById('flipper-download-all-btn');
    const outputFiles = document.getElementById('flipper-output-files');
    const previewSection = document.getElementById('flipper-preview-section');
    const originalPreviewImg = document.querySelector('#flipper-original-preview img');
    const originalPreviewDims = document.querySelector('#flipper-original-preview .preview-dimensions');
    const resultPreviewImg = document.querySelector('#flipper-result-preview img');
    const resultPreviewDims = document.querySelector('#flipper-result-preview .preview-dimensions');

    let uploadedImages = [];
    let processedImages = [];

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

    function applyTransformToImage(imgData, transformFn) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: true });

        const { width, height, element } = imgData;
        const { newWidth, newHeight, drawFn } = transformFn(width, height);

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.clearRect(0, 0, newWidth, newHeight);

        ctx.save();
        drawFn(ctx, element, width, height, newWidth, newHeight);
        ctx.restore();

        return canvas;
    }

    function getFlipTransform(flipX, flipY) {
        return function(width, height) {
            return {
                newWidth: width,
                newHeight: height,
                drawFn: function(ctx, element, w, h, nw, nh) {
                    ctx.translate(flipX ? nw : 0, flipY ? nh : 0);
                    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
                    ctx.drawImage(element, 0, 0, w, h);
                }
            };
        };
    }

    function getRotateTransform(angle) {
        return function(width, height) {
            if (angle === 180) {
                return {
                    newWidth: width,
                    newHeight: height,
                    drawFn: function(ctx, element, w, h, nw, nh) {
                        ctx.translate(nw, nh);
                        ctx.rotate(Math.PI);
                        ctx.drawImage(element, 0, 0, w, h);
                    }
                };
            } else if (angle === 90) {
                return {
                    newWidth: height,
                    newHeight: width,
                    drawFn: function(ctx, element, w, h, nw, nh) {
                        ctx.translate(nw, 0);
                        ctx.rotate(Math.PI / 2);
                        ctx.drawImage(element, 0, 0, w, h);
                    }
                };
            } else {
                return {
                    newWidth: height,
                    newHeight: width,
                    drawFn: function(ctx, element, w, h, nw, nh) {
                        ctx.translate(0, nh);
                        ctx.rotate(-Math.PI / 2);
                        ctx.drawImage(element, 0, 0, w, h);
                    }
                };
            }
        };
    }

    function processAllImages(transformFn) {
        if (uploadedImages.length === 0) {
            showNotification('请先上传图片', 'warning');
            return;
        }

        showNotification('正在批量处理图片...', 'info');
        let completed = 0;

        uploadedImages.forEach((imgData, index) => {
            const canvas = applyTransformToImage(imgData, transformFn);
            const dataUrl = canvas.toDataURL('image/png');

            canvas.toBlob(blob => {
                if (!blob) {
                    completed++;
                    checkAllDone();
                    return;
                }

                if (processedImages[index] && processedImages[index].previewUrl) {
                    URL.revokeObjectURL(processedImages[index].previewUrl);
                }

                processedImages[index] = {
                    name: cleanFileName(imgData.file.name) + '.png',
                    format: 'png',
                    size: blob.size,
                    blob: blob,
                    dataUrl: dataUrl,
                    width: canvas.width,
                    height: canvas.height
                };

                completed++;
                checkAllDone();
            }, 'image/png');
        });

        function checkAllDone() {
            if (completed === uploadedImages.length) {
                updatePreview();
                updateOutputDisplay();
                showNotification(`批量处理完成: ${uploadedImages.length} 张图片`, 'success');
            }
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
            resultPreviewImg.src = firstResult.dataUrl;
            resultPreviewDims.textContent = `${firstResult.width}×${firstResult.height}`;
        } else {
            resultPreviewImg.src = firstImg.url;
            resultPreviewDims.textContent = `${firstImg.width}×${firstImg.height}`;
        }

        previewSection.style.display = 'block';
        enablePreviewZoom(originalPreview);
        enablePreviewZoom(resultPreview);
    }

    function resetAll() {
        if (uploadedImages.length === 0) {
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

        document.querySelectorAll('.download-single-btn').forEach(btn => {
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

    flipXBtn.addEventListener('click', () => processAllImages(getFlipTransform(true, false)));
    flipYBtn.addEventListener('click', () => processAllImages(getFlipTransform(false, true)));
    flipXYBtn.addEventListener('click', () => processAllImages(getFlipTransform(true, true)));
    rotate90Btn.addEventListener('click', () => processAllImages(getRotateTransform(90)));
    rotate180Btn.addEventListener('click', () => processAllImages(getRotateTransform(180)));
    rotate270Btn.addEventListener('click', () => processAllImages(getRotateTransform(270)));
    resetBtn.addEventListener('click', resetAll);
    downloadAllBtn.addEventListener('click', downloadAllProcessed);

    const uploadArea = document.querySelector('#image-flipper .file-upload-area');
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
            if (result && result.dataUrl && result.dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(result.dataUrl);
            }
        });
    });
}
