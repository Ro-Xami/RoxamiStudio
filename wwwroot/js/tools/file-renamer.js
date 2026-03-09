function initFileRenamer() {
    console.log('Initializing File Renamer');

    const folderInput = document.getElementById('folder-input');
    const folderInfo = document.getElementById('folder-info');
    const folderName = document.getElementById('folder-name');
    const fileCount = document.getElementById('file-count');
    const totalSize = document.getElementById('total-size');
    const previewSection = document.getElementById('folder-preview-section');
    const fileListContent = document.getElementById('file-list-content');
    const renamePrefixInput = document.getElementById('rename-prefix-input');
    const sortMethodSelect = document.getElementById('sort-method-select');
    const startIndexInput = document.getElementById('start-index-input');
    const digitsInput = document.getElementById('digits-input');
    const previewRenameBtn = document.getElementById('preview-rename-btn');
    const executeRenameBtn = document.getElementById('execute-rename-btn');
    const downloadRenamedBtn = document.getElementById('download-renamed-btn');
    const renameOutputFiles = document.getElementById('rename-output-files');

    let selectedFiles = [];
    let renamedFiles = [];
    let currentFolderName = '';

    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to format date
    function formatDate(date) {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Helper function to get cleaned filename prefix
    function getFilenamePrefix() {
        const prefix = renamePrefixInput.value.trim();
        // Clean up prefix: remove illegal filename characters, limit length
        const cleaned = prefix.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
        return cleaned ? cleaned + '_' : '';
    }

    // Helper function to extract file extension
    function getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
    }

    // Helper function to get filename without extension
    function getFileNameWithoutExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(0, lastDot) : filename;
    }

    // Helper function to generate padded number
    function getPaddedNumber(number, digits) {
        return number.toString().padStart(digits, '0');
    }

    // Process selected folder
    function processSelectedFolder(files) {
        selectedFiles = Array.from(files);
        currentFolderName = files.length > 0 ? files[0].webkitRelativePath.split('/')[0] : '';

        // Update folder info display
        folderName.textContent = currentFolderName || '未命名文件夹';
        fileCount.textContent = selectedFiles.length;

        const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        totalSize.textContent = formatFileSize(totalBytes);
        folderInfo.style.display = 'block';

        // Show preview section
        previewSection.style.display = 'block';

        // Clear and update file list preview
        updateFileListPreview();

        // Clear previous outputs
        clearRenameOutputs();

        showNotification(`已选择文件夹 "${currentFolderName}"，包含 ${selectedFiles.length} 个文件`, 'success');
    }

    // Update file list preview
    function updateFileListPreview() {
        if (selectedFiles.length === 0) {
            fileListContent.innerHTML = '<div class="no-files">没有文件</div>';
            return;
        }

        let html = '';
        selectedFiles.forEach((file, index) => {
            const extension = getFileExtension(file.name);
            const iconClass = getFileIconClass(extension);

            html += `
                <div class="file-list-item">
                    <span class="file-name">
                        <i class="fas ${iconClass}"></i>
                        ${file.name}
                    </span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <span class="file-time">${formatDate(new Date(file.lastModified))}</span>
                </div>
            `;
        });

        fileListContent.innerHTML = html;
    }

    // Get appropriate icon class based on file extension
    function getFileIconClass(extension) {
        const iconMap = {
            // Images
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image',
            'gif': 'fa-file-image', 'bmp': 'fa-file-image', 'svg': 'fa-file-image',
            'webp': 'fa-file-image',
            // Documents
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
            'txt': 'fa-file-alt', 'rtf': 'fa-file-alt',
            // Spreadsheets
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'csv': 'fa-file-csv',
            // Presentations
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
            // Archives
            'zip': 'fa-file-archive', 'rar': 'fa-file-archive', '7z': 'fa-file-archive',
            'tar': 'fa-file-archive', 'gz': 'fa-file-archive',
            // Audio/Video
            'mp3': 'fa-file-audio', 'wav': 'fa-file-audio', 'flac': 'fa-file-audio',
            'mp4': 'fa-file-video', 'avi': 'fa-file-video', 'mov': 'fa-file-video',
            'mkv': 'fa-file-video', 'webm': 'fa-file-video',
            // Code
            'js': 'fa-file-code', 'html': 'fa-file-code', 'css': 'fa-file-code',
            'json': 'fa-file-code', 'xml': 'fa-file-code', 'py': 'fa-file-code',
            'java': 'fa-file-code', 'cpp': 'fa-file-code', 'c': 'fa-file-code',
            'cs': 'fa-file-code', 'php': 'fa-file-code'
        };

        return iconMap[extension] || 'fa-file';
    }

    // Sort files based on selected method
    function sortFiles(files, method) {
        const sortedFiles = [...files];

        switch (method) {
            case 'name-asc':
                sortedFiles.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sortedFiles.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'time-asc':
                sortedFiles.sort((a, b) => a.lastModified - b.lastModified);
                break;
            case 'time-desc':
                sortedFiles.sort((a, b) => b.lastModified - a.lastModified);
                break;
        }

        return sortedFiles;
    }

    // Generate new filenames based on settings
    function generateNewFilenames() {
        if (selectedFiles.length === 0) {
            showNotification('请先选择文件夹', 'warning');
            return [];
        }

        const prefix = getFilenamePrefix();
        const sortMethod = sortMethodSelect.value;
        const startIndex = parseInt(startIndexInput.value) || 0;
        const digits = parseInt(digitsInput.value) || 3;

        // Sort files
        const sortedFiles = sortFiles(selectedFiles, sortMethod);

        // Generate new filenames
        const renamed = sortedFiles.map((file, index) => {
            const extension = getFileExtension(file.name);
            const paddedNumber = getPaddedNumber(startIndex + index, digits);
            const newName = `${prefix}${paddedNumber}.${extension}`;

            return {
                originalFile: file,
                originalName: file.name,
                newName: newName,
                extension: extension,
                index: index,
                size: file.size,
                lastModified: file.lastModified
            };
        });

        return renamed;
    }

    // Preview rename results
    function previewRename() {
        renamedFiles = generateNewFilenames();

        if (renamedFiles.length === 0) return;

        // Update output display
        updateRenameOutputDisplay();

        // Enable execute button
        executeRenameBtn.disabled = false;
        downloadRenamedBtn.disabled = false;

        showNotification(`已生成重命名预览，共 ${renamedFiles.length} 个文件`, 'success');
    }

    // Execute rename (prepare files for download)
    function executeRename() {
        if (renamedFiles.length === 0) {
            showNotification('请先生成重命名预览', 'warning');
            return;
        }

        showNotification('准备重命名文件下载...', 'info');

        // Create renamed files for download
        renamedFiles.forEach((fileInfo, index) => {
            // Note: In browser environment, we cannot rename original files
            // Instead, we'll prepare the files for download with new names
            // The actual renaming happens during download
        });

        showNotification('重命名准备完成，点击"下载重命名后文件"按钮下载文件', 'success');
    }

    // Download renamed files
    async function downloadRenamedFiles() {
        if (renamedFiles.length === 0) {
            showNotification('没有可下载的文件', 'warning');
            return;
        }

        const totalFiles = renamedFiles.length;
        showNotification(`准备下载 ${totalFiles} 个文件...`, 'info');

        // Download files sequentially with a small delay between each to avoid overwhelming the browser
        for (let i = 0; i < totalFiles; i++) {
            const fileInfo = renamedFiles[i];
            const progress = `${i + 1}/${totalFiles}`;
            await downloadSingleFile(fileInfo, progress);

            // Small fixed delay between files to prevent browser congestion
            if (i < totalFiles - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        showNotification(`成功下载 ${totalFiles} 个文件`, 'success');
    }

    // Download single file
    async function downloadSingleFile(fileInfo, progress) {
        // Show progress notification (update existing notification if possible)
        showNotification(`正在下载 ${progress}: ${fileInfo.newName}`, 'info');

        // Create download link
        const url = URL.createObjectURL(fileInfo.originalFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileInfo.newName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Return a resolved promise (download is synchronous after click)
        return Promise.resolve();
    }

    // Update rename output display
    function updateRenameOutputDisplay() {
        if (renamedFiles.length === 0) {
            renameOutputFiles.innerHTML = '<p class="no-output">暂无重命名结果。</p>';
            return;
        }

        let html = '';
        renamedFiles.forEach(fileInfo => {
            const iconClass = getFileIconClass(fileInfo.extension);

            html += `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="file-item-details">
                            <h5>${fileInfo.newName}</h5>
                            <p>原名: ${fileInfo.originalName} • ${fileInfo.extension.toUpperCase()} • ${formatFileSize(fileInfo.size)}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        renameOutputFiles.innerHTML = html;
    }

    // Clear rename outputs
    function clearRenameOutputs() {
        renamedFiles = [];
        updateRenameOutputDisplay();
        executeRenameBtn.disabled = true;
        downloadRenamedBtn.disabled = true;
    }

    // File input handling
    folderInput.addEventListener('change', handleFolderSelection);

    // Drag and drop support
    const uploadArea = document.querySelector('#file-renamer .file-upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }

    // Button event listeners
    previewRenameBtn.addEventListener('click', previewRename);
    executeRenameBtn.addEventListener('click', executeRename);
    downloadRenamedBtn.addEventListener('click', downloadRenamedFiles);

    // Input change listeners for real-time preview
    renamePrefixInput.addEventListener('input', () => {
        if (selectedFiles.length > 0) {
            renamedFiles = generateNewFilenames();
            updateRenameOutputDisplay();
        }
    });

    sortMethodSelect.addEventListener('change', () => {
        if (selectedFiles.length > 0) {
            renamedFiles = generateNewFilenames();
            updateRenameOutputDisplay();
        }
    });

    startIndexInput.addEventListener('input', () => {
        if (selectedFiles.length > 0) {
            renamedFiles = generateNewFilenames();
            updateRenameOutputDisplay();
        }
    });

    digitsInput.addEventListener('input', () => {
        if (selectedFiles.length > 0) {
            renamedFiles = generateNewFilenames();
            updateRenameOutputDisplay();
        }
    });

    function handleFolderSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        processSelectedFolder(files);
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (uploadArea) {
            uploadArea.style.borderColor = 'var(--color-active)';
            uploadArea.style.backgroundColor = 'var(--color-hover)';
        }
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        if (uploadArea) {
            uploadArea.style.borderColor = 'var(--color-border)';
            uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        if (uploadArea) {
            uploadArea.style.borderColor = 'var(--color-border)';
            uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
        }

        const files = event.dataTransfer.files;
        if (!files || files.length === 0) return;

        // Check if files are from a directory (webkitdirectory)
        // Note: Drag and drop of folders is limited in browser security
        // We'll process all dropped files as a batch
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < files.length; i++) {
            dataTransfer.items.add(files[i]);
        }
        folderInput.files = dataTransfer.files;

        processSelectedFolder(files);
    }
}