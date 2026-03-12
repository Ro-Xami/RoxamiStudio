function initSpriteSheetTool() {
    console.log('Initializing Sprite Sheet Combiner/Splitter Tool');

    // === 合并功能元素 ===
    const mergeImagesInput = document.getElementById('merge-images-input');
    const mergeFileInfo = document.getElementById('merge-file-info');
    const mergeFileCount = document.getElementById('merge-file-count');
    const mergeTotalSize = document.getElementById('merge-total-size');
    const mergePreviewSection = document.getElementById('merge-preview-section');
    const mergePreviewContainer = document.getElementById('merge-preview-container');
    const mergeOutputNameInput = document.getElementById('merge-output-name-input');
    const mergeRowsInput = document.getElementById('merge-rows-input');
    const mergeDirectionSelect = document.getElementById('merge-direction-select');
    const mergeImagesBtn = document.getElementById('merge-images-btn');
    const downloadMergedBtn = document.getElementById('download-merged-btn');
    const mergeOutputFiles = document.getElementById('merge-output-files');

    // === 拆分功能元素 ===
    const splitSheetInput = document.getElementById('split-sheet-input');
    const splitFileInfo = document.getElementById('split-file-info');
    const splitFileName = document.getElementById('split-file-name');
    const splitFileSize = document.getElementById('split-file-size');
    const splitPreviewSection = document.getElementById('split-preview-section');
    const splitPreviewImage = document.getElementById('split-preview-image');
    const splitOutputPrefixInput = document.getElementById('split-output-prefix-input');
    const splitRowsInput = document.getElementById('split-rows-input');
    const splitColsInput = document.getElementById('split-cols-input');
    const splitDirectionSelect = document.getElementById('split-direction-select');
    const splitSheetBtn = document.getElementById('split-sheet-btn');
    const downloadSplitBtn = document.getElementById('download-split-btn');
    const splitOutputFiles = document.getElementById('split-output-files');

    // === 状态变量 ===
    let mergeImages = []; // 存储合并的图片对象
    let mergedSheet = null; // 合并后的图集
    let splitSheet = null; // 拆分的图集
    let splitImages = []; // 拆分后的图片数组

    // === 辅助函数 ===
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function cleanFileName(filename, removeExtension = true) {
        if (!filename) return '';
        let name = filename;
        if (removeExtension) {
            name = name.replace(/\.[^/.]+$/, '');
        }
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    }

    // === 合并功能 ===
    function processMergeImageUpload(files) {
        // 清理之前图片的对象URL
        mergeImages.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            }
        });

        mergeImages = [];
        let totalSize = 0;
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showNotification('请上传图片文件', 'warning');
            return;
        }

        // 验证所有图片尺寸是否一致
        const imagePromises = imageFiles.map(file => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    // 不要立即撤销URL，保存供预览使用
                    resolve({
                        file,
                        width: img.width,
                        height: img.height,
                        url: url,
                        imageElement: img
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
                // 检查所有图片尺寸是否一致
                const firstWidth = images[0].width;
                const firstHeight = images[0].height;
                const allSameSize = images.every(img => img.width === firstWidth && img.height === firstHeight);

                if (!allSameSize) {
                    showNotification('所有图片必须具有相同的尺寸', 'warning');
                    return;
                }

                mergeImages = images;
                totalSize = images.reduce((sum, img) => sum + img.file.size, 0);

                // 更新文件信息显示
                mergeFileCount.textContent = images.length;
                mergeTotalSize.textContent = formatFileSize(totalSize);
                mergeFileInfo.style.display = 'block';

                // 显示预览
                updateMergePreview(images);

                showNotification(`成功上传 ${images.length} 张序列图`, 'success');
            })
            .catch(error => {
                showNotification(`图片加载失败: ${error.message}`, 'error');
            });
    }

    function updateMergePreview(images) {
        if (images.length === 0) {
            mergePreviewSection.style.display = 'none';
            return;
        }

        mergePreviewContainer.innerHTML = '';
        const maxPreview = 6; // 最多显示6张预览

        for (let i = 0; i < Math.min(images.length, maxPreview); i++) {
            const img = images[i];
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.innerHTML = `
                <img src="${img.url}" alt="预览 ${i + 1}" style="max-width: 100px; max-height: 100px;">
                <small>${img.file.name}</small>
                <small>${img.width}×${img.height}</small>
            `;
            mergePreviewContainer.appendChild(previewDiv);
        }

        if (images.length > maxPreview) {
            const moreDiv = document.createElement('div');
            moreDiv.textContent = `... 还有 ${images.length - maxPreview} 张图片`;
            moreDiv.style.textAlign = 'center';
            moreDiv.style.padding = '10px';
            mergePreviewContainer.appendChild(moreDiv);
        }

        mergePreviewSection.style.display = 'block';
    }

    function mergeSpriteSheet() {
        if (mergeImages.length === 0) {
            showNotification('请先上传序列图', 'warning');
            return;
        }

        const rows = parseInt(mergeRowsInput.value);
        if (isNaN(rows) || rows < 1) {
            showNotification('请输入有效的行数', 'warning');
            return;
        }

        const direction = mergeDirectionSelect.value;
        const imageCount = mergeImages.length;
        const cols = Math.ceil(imageCount / rows);

        // 计算画布尺寸
        const firstImage = mergeImages[0];
        const spriteWidth = firstImage.width;
        const spriteHeight = firstImage.height;
        const canvasWidth = spriteWidth * cols;
        const canvasHeight = spriteHeight * rows;

        // 创建画布
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { alpha: true });

        // 清除画布（透明背景）
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        showNotification('正在合并序列图...', 'info');

        // 使用Promise等待所有图片绘制完成
        const drawPromises = [];

        // 根据方向排列图片
        for (let i = 0; i < imageCount; i++) {
            let row, col;

            // 根据方向计算行列位置
            switch (direction) {
                case 'lr-tb': // 从左到右，从上到下
                    row = Math.floor(i / cols);
                    col = i % cols;
                    break;
                case 'rl-tb': // 从右到左，从上到下
                    row = Math.floor(i / cols);
                    col = cols - 1 - (i % cols);
                    break;
                case 'lr-bt': // 从左到右，从下到上
                    row = rows - 1 - Math.floor(i / cols);
                    col = i % cols;
                    break;
                case 'rl-bt': // 从右到左，从下到上
                    row = rows - 1 - Math.floor(i / cols);
                    col = cols - 1 - (i % cols);
                    break;
                default:
                    row = Math.floor(i / cols);
                    col = i % cols;
            }

            const x = col * spriteWidth;
            const y = row * spriteHeight;

            // 创建绘制Promise
            const drawPromise = new Promise((resolve, reject) => {
                // 使用已加载的imageElement而不是重新加载
                const img = mergeImages[i].imageElement || new Image();

                if (img.complete && img.naturalWidth > 0) {
                    // 图片已经加载完成
                    ctx.drawImage(img, x, y, spriteWidth, spriteHeight);
                    resolve();
                } else {
                    // 图片需要加载
                    img.onload = () => {
                        ctx.drawImage(img, x, y, spriteWidth, spriteHeight);
                        resolve();
                    };
                    img.onerror = () => {
                        reject(new Error(`无法加载图片: ${mergeImages[i].file.name}`));
                    };

                    // 如果img是新创建的Image对象，设置src
                    if (!mergeImages[i].imageElement) {
                        img.src = mergeImages[i].url;
                    }
                }
            });

            drawPromises.push(drawPromise);
        }

        // 等待所有图片绘制完成
        Promise.all(drawPromises)
            .then(() => {
                // 所有图片绘制完成后转换为Blob
                canvas.toBlob(blob => {
                    if (!blob) {
                        showNotification('生成图片失败', 'error');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64Data = event.target.result.split(',')[1];
                        const outputName = mergeOutputNameInput.value.trim() || 'sprite_sheet';
                        const fileName = `${cleanFileName(outputName, false)}.png`;

                        mergedSheet = {
                            name: fileName,
                            format: 'png',
                            size: blob.size,
                            data: base64Data,
                            blob: blob,
                            width: canvasWidth,
                            height: canvasHeight,
                            rows: rows,
                            cols: cols,
                            direction: direction
                        };

                        // 更新合并输出显示
                        updateMergeOutput(mergedSheet);
                        showNotification(`序列图集合并成功: ${fileName} (${canvasWidth}×${canvasHeight})`, 'success');
                    };
                    reader.readAsDataURL(blob);
                }, 'image/png');
            })
            .catch(error => {
                showNotification(`合并失败: ${error.message}`, 'error');
            });
    }

    function updateMergeOutput(sheet) {
        if (!sheet) {
            mergeOutputFiles.innerHTML = '<p class="no-output">暂无合并输出。</p>';
            downloadMergedBtn.disabled = true;
            return;
        }

        const html = `
            <div class="file-item">
                <div class="file-item-info">
                    <div class="file-item-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="file-item-details">
                        <h5>${sheet.name}</h5>
                        <p>PNG • ${formatFileSize(sheet.size)} • 尺寸: ${sheet.width}×${sheet.height} • 布局: ${sheet.rows}行×${sheet.cols}列</p>
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="small-btn" id="download-merged-sheet-btn">
                        <i class="fas fa-download"></i> 下载
                    </button>
                </div>
            </div>
        `;

        mergeOutputFiles.innerHTML = html;
        downloadMergedBtn.disabled = false;

        // 添加下载按钮事件
        document.getElementById('download-merged-sheet-btn').addEventListener('click', downloadMergedSheet);
    }

    function downloadMergedSheet() {
        if (!mergedSheet) return;

        const blob = mergedSheet.blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mergedSheet.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${mergedSheet.name} 下载成功`, 'success');
    }

    // === 拆分功能 ===
    function processSplitSheetUpload(file) {
        if (!file.type.startsWith('image/')) {
            showNotification('请上传图片文件', 'warning');
            return;
        }

        // 清理之前的对象URL
        if (splitSheet && splitSheet.url && splitSheet.url.startsWith('blob:')) {
            URL.revokeObjectURL(splitSheet.url);
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            splitSheet = {
                file: file,
                url: url,
                width: img.width,
                height: img.height,
                image: img
            };

            // 更新文件信息显示
            splitFileName.textContent = file.name;
            splitFileSize.textContent = formatFileSize(file.size);
            splitFileInfo.style.display = 'block';

            // 显示预览
            splitPreviewImage.src = url;
            splitPreviewSection.style.display = 'block';

            showNotification(`序列图集 "${file.name}" 上传成功，尺寸: ${img.width}×${img.height}`, 'success');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            showNotification('无法加载图片文件', 'error');
        };
        img.src = url;
    }

    function splitSpriteSheet() {
        if (!splitSheet) {
            showNotification('请先上传序列图集', 'warning');
            return;
        }

        const rows = parseInt(splitRowsInput.value);
        const cols = parseInt(splitColsInput.value);
        if (isNaN(rows) || rows < 1 || isNaN(cols) || cols < 1) {
            showNotification('请输入有效的行数和列数', 'warning');
            return;
        }

        const direction = splitDirectionSelect.value;
        const sheetWidth = splitSheet.width;
        const sheetHeight = splitSheet.height;
        const spriteWidth = Math.floor(sheetWidth / cols);
        const spriteHeight = Math.floor(sheetHeight / rows);

        if (spriteWidth < 1 || spriteHeight < 1) {
            showNotification('行列数设置错误，导致子图尺寸为0', 'error');
            return;
        }

        showNotification(`正在拆分序列图集为 ${rows}×${cols} 个子图...`, 'info');

        splitImages = [];
        const totalSprites = rows * cols;
        const processingPromises = [];

        // 根据方向提取子图
        for (let i = 0; i < totalSprites; i++) {
            let row, col;

            // 根据方向计算行列位置
            switch (direction) {
                case 'lr-tb': // 从左到右，从上到下
                    row = Math.floor(i / cols);
                    col = i % cols;
                    break;
                case 'rl-tb': // 从右到左，从上到下
                    row = Math.floor(i / cols);
                    col = cols - 1 - (i % cols);
                    break;
                case 'lr-bt': // 从左到右，从下到上
                    row = rows - 1 - Math.floor(i / cols);
                    col = i % cols;
                    break;
                case 'rl-bt': // 从右到左，从下到上
                    row = rows - 1 - Math.floor(i / cols);
                    col = cols - 1 - (i % cols);
                    break;
                default:
                    row = Math.floor(i / cols);
                    col = i % cols;
            }

            const sx = col * spriteWidth;
            const sy = row * spriteHeight;

            // 为每个子图创建处理Promise
            const processPromise = new Promise((resolve, reject) => {
                // 为每个子图创建独立的画布
                const canvas = document.createElement('canvas');
                canvas.width = spriteWidth;
                canvas.height = spriteHeight;
                const ctx = canvas.getContext('2d', { alpha: true });

                // 绘制子图区域
                ctx.drawImage(splitSheet.image, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);

                // 转换为Blob
                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error(`生成子图 ${i} 失败`));
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64Data = event.target.result.split(',')[1];
                        const prefix = splitOutputPrefixInput.value.trim() || cleanFileName(splitSheet.file.name, true);
                        const spriteNumber = i.toString().padStart(3, '0');
                        const fileName = `${prefix}_${spriteNumber}.png`;

                        const spriteObject = {
                            id: Date.now() + i,
                            name: fileName,
                            format: 'png',
                            size: blob.size,
                            data: base64Data,
                            blob: blob,
                            index: i,
                            row: row,
                            col: col,
                            width: spriteWidth,
                            height: spriteHeight
                        };

                        resolve(spriteObject);
                    };
                    reader.readAsDataURL(blob);
                }, 'image/png');
            });

            processingPromises.push(processPromise);
        }

        // 等待所有子图处理完成
        Promise.all(processingPromises)
            .then(sprites => {
                // 按索引排序，确保顺序正确
                sprites.sort((a, b) => a.index - b.index);
                splitImages = sprites;

                updateSplitOutput(splitImages);
                showNotification(`成功拆分 ${totalSprites} 个子图`, 'success');
            })
            .catch(error => {
                showNotification(`拆分失败: ${error.message}`, 'error');
            });
    }

    function updateSplitOutput(sprites) {
        if (sprites.length === 0) {
            splitOutputFiles.innerHTML = '<p class="no-output">暂无拆分输出。</p>';
            downloadSplitBtn.disabled = true;
            return;
        }

        let html = '';
        sprites.forEach(sprite => {
            html += `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-icon">
                            <i class="fas fa-image"></i>
                        </div>
                        <div class="file-item-details">
                            <h5>${sprite.name}</h5>
                            <p>PNG • ${formatFileSize(sprite.size)} • 尺寸: ${sprite.width}×${sprite.height} • 位置: 第${sprite.row + 1}行第${sprite.col + 1}列</p>
                        </div>
                    </div>
                    <div class="file-item-actions">
                        <button class="small-btn download-single-sprite-btn" data-id="${sprite.id}">
                            <i class="fas fa-download"></i> 下载
                        </button>
                    </div>
                </div>
            `;
        });

        splitOutputFiles.innerHTML = html;
        downloadSplitBtn.disabled = false;

        // 添加单个下载按钮事件
        document.querySelectorAll('.download-single-sprite-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                downloadSingleSprite(id);
            });
        });
    }

    function downloadSingleSprite(id) {
        const sprite = splitImages.find(s => s.id === id);
        if (!sprite) return;

        const blob = sprite.blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sprite.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${sprite.name} 下载成功`, 'success');
    }

    function downloadAllSplitSprites() {
        if (splitImages.length === 0) return;

        showNotification(`正在准备 ${splitImages.length} 张拆分图片下载...`, 'info');

        // 逐个下载，避免浏览器限制
        splitImages.forEach((sprite, index) => {
            setTimeout(() => {
                downloadSingleSprite(sprite.id);
            }, index * 300);
        });
    }

    // === 事件处理 ===
    // 合并功能事件
    mergeImagesInput.addEventListener('change', function(event) {
        const files = event.target.files;
        if (files.length > 0) {
            processMergeImageUpload(files);
        }
    });

    mergeImagesBtn.addEventListener('click', mergeSpriteSheet);
    downloadMergedBtn.addEventListener('click', downloadMergedSheet);

    // 拆分功能事件
    splitSheetInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            processSplitSheetUpload(file);
        }
    });

    splitSheetBtn.addEventListener('click', splitSpriteSheet);
    downloadSplitBtn.addEventListener('click', downloadAllSplitSprites);

    // 拖放支持
    const mergeUploadArea = document.querySelector('#sprite-sheet-tool .tool-ui:first-child .file-upload-area');
    const splitUploadArea = document.querySelector('#sprite-sheet-tool .tool-ui:last-child .file-upload-area');

    function setupDragDrop(uploadArea, inputElement, callback) {
        if (!uploadArea) return;

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
                // 设置文件输入值
                const dataTransfer = new DataTransfer();
                for (let i = 0; i < files.length; i++) {
                    dataTransfer.items.add(files[i]);
                }
                inputElement.files = dataTransfer.files;

                // 触发回调
                callback(files);
            }
        });
    }

    if (mergeUploadArea) {
        setupDragDrop(mergeUploadArea, mergeImagesInput, processMergeImageUpload);
    }

    if (splitUploadArea) {
        setupDragDrop(splitUploadArea, splitSheetInput, (files) => {
            if (files[0]) processSplitSheetUpload(files[0]);
        });
    }

    // 清理对象URL
    window.addEventListener('beforeunload', function() {
        mergeImages.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            }
        });
        if (splitSheet && splitSheet.url && splitSheet.url.startsWith('blob:')) {
            URL.revokeObjectURL(splitSheet.url);
        }
    });
}