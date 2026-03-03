function initVideoFrameExtractor() {
    console.log('Initializing Video Frame Extractor');

    const videoFileInput = document.getElementById('video-file-input');
    const fileInfo = document.getElementById('video-file-info');
    const fileName = document.getElementById('video-file-name');
    const fileSize = document.getElementById('video-file-size');
    const videoDuration = document.getElementById('video-duration');
    const previewSection = document.getElementById('video-preview-section');
    const videoPreview = document.getElementById('video-preview');
    const extractFramesBtn = document.getElementById('extract-frames-btn');
    const downloadAllFramesBtn = document.getElementById('download-all-frames-btn');
    const clearFramesBtn = document.getElementById('clear-frames-btn');
    const framesOutputFiles = document.getElementById('frames-output-files');
    const framePrefixInput = document.getElementById('frame-prefix-input');
    const fpsInput = document.getElementById('fps-input');
    const frameCalcRow = document.getElementById('frame-calc-row');
    const totalFramesCalc = document.getElementById('total-frames-calc');

    let uploadedVideo = null;
    let videoElement = null;
    let extractedFrames = [];
    let videoObjectURL = null;

    // Helper function to get cleaned filename prefix
    function getFilenamePrefix() {
        if (!framePrefixInput) return '';
        const prefix = framePrefixInput.value.trim();
        // Clean up prefix: remove illegal filename characters, limit length
        const cleaned = prefix.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
        return cleaned ? cleaned + '_' : '';
    }

    // Helper function to clean a filename (remove extension and illegal characters)
    function cleanFileName(filename, removeExtension = true) {
        if (!filename) return '';
        let name = filename;
        if (removeExtension) {
            // Remove file extension
            name = name.replace(/\.[^/.]+$/, '');
        }
        // Remove illegal filename characters and replace spaces with underscores
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    }

    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to format time (seconds to HH:MM:SS or MM:SS)
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Calculate and display total frames based on FPS and video duration
    function calculateAndDisplayTotalFrames() {
        if (!videoElement || !videoElement.duration) {
            frameCalcRow.style.display = 'none';
            return;
        }

        const fps = parseInt(fpsInput.value);
        if (isNaN(fps) || fps < 1 || fps > 120) {
            frameCalcRow.style.display = 'none';
            return;
        }

        const duration = videoElement.duration;
        const totalFrames = Math.floor(duration * fps);

        if (totalFrames < 1) {
            frameCalcRow.style.display = 'none';
            return;
        }

        totalFramesCalc.textContent = totalFrames;
        frameCalcRow.style.display = 'flex';
    }

    // Extract frames from video
    function extractFrames() {
        if (!uploadedVideo || !videoElement) {
            showNotification('请先上传视频文件', 'warning');
            return;
        }

        const fps = parseInt(fpsInput.value);
        if (isNaN(fps) || fps < 1 || fps > 120) {
            showNotification('请输入有效的FPS（1-120）', 'warning');
            return;
        }

        // Calculate total frames based on video duration and FPS
        const duration = videoElement.duration;
        const frameCount = Math.floor(duration * fps);

        if (frameCount < 1) {
            showNotification('视频时长太短，无法提取帧', 'warning');
            return;
        }

        // Optional: limit maximum frames to prevent browser overload
        const MAX_FRAMES = 1000;
        const actualFrameCount = Math.min(frameCount, MAX_FRAMES);

        if (frameCount > MAX_FRAMES) {
            showNotification(`视频将生成 ${frameCount} 帧，限于 ${MAX_FRAMES} 帧提取`, 'info');
        }

        showNotification(`正在提取 ${actualFrameCount} 帧 (基于 ${fps} FPS)...`, 'info');

        // Clear previous frames
        extractedFrames = [];
        updateFramesDisplay();

        // Create canvas for frame extraction
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: true }); // Enable alpha channel

        // Set canvas dimensions to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Calculate time intervals
        const interval = duration / (actualFrameCount + 1); // Distribute frames evenly, avoid start/end

        // Extract frames sequentially with delays to avoid blocking
        let framesExtracted = 0;

        function extractFrameAtIndex(index) {
            if (index >= actualFrameCount) {
                // All frames extracted
                showNotification(`成功提取 ${actualFrameCount} 帧`, 'success');
                updateFramesDisplay();
                return;
            }

            // Seek to specific time
            const targetTime = interval * (index + 1); // Skip 0 to avoid black frames
            videoElement.currentTime = targetTime;

            // Wait for seek to complete
            videoElement.onseeked = function() {
                // Draw frame to canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                // Get image data with alpha channel
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Convert to PNG data URL
                canvas.toBlob(function(blob) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64Data = event.target.result.split(',')[1];

                        // Create frame object
                        const frameNumber = (index + 1).toString().padStart(3, '0');
                        const baseName = cleanFileName(uploadedVideo.name, true);
                        const prefix = getFilenamePrefix();
                        const frameName = `${prefix}${baseName}_frame_${frameNumber}.png`;

                        const frameObject = {
                            id: Date.now() + index,
                            name: frameName,
                            format: 'png',
                            size: blob.size,
                            type: 'frame',
                            data: base64Data,
                            blob: blob,
                            index: index,
                            time: targetTime
                        };

                        extractedFrames.push(frameObject);
                        framesExtracted++;

                        // Update progress
                        if (framesExtracted === actualFrameCount) {
                            showNotification(`成功提取 ${actualFrameCount} 帧`, 'success');
                            updateFramesDisplay();
                        }

                        // Extract next frame with small delay
                        setTimeout(() => extractFrameAtIndex(index + 1), 50);
                    };
                    reader.readAsDataURL(blob);
                }, 'image/png');
            };

            videoElement.onerror = function() {
                console.error('Error seeking video');
                // Try next frame
                setTimeout(() => extractFrameAtIndex(index + 1), 50);
            };
        }

        // Start extraction
        extractFrameAtIndex(0);
    }

    // Update frames display
    function updateFramesDisplay() {
        if (extractedFrames.length === 0) {
            framesOutputFiles.innerHTML = '<p class="no-output">暂无提取输出。</p>';
            downloadAllFramesBtn.disabled = true;
            return;
        }

        let html = '';
        extractedFrames.forEach(frame => {
            html += `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-icon">
                            <i class="fas fa-image"></i>
                        </div>
                        <div class="file-item-details">
                            <h5>${frame.name}</h5>
                            <p>帧 ${frame.index + 1} • PNG • ${formatFileSize(frame.size)} • 时间: ${formatTime(frame.time)}</p>
                        </div>
                    </div>
                    <div class="file-item-actions">
                        <button class="small-btn download-single-frame-btn" data-id="${frame.id}">
                            <i class="fas fa-download"></i> 下载
                        </button>
                    </div>
                </div>
            `;
        });

        framesOutputFiles.innerHTML = html;
        downloadAllFramesBtn.disabled = false;

        // Add event listeners to single download buttons
        document.querySelectorAll('.download-single-frame-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                downloadSingleFrame(id);
            });
        });
    }

    // Download single frame
    function downloadSingleFrame(id) {
        const frame = extractedFrames.find(f => f.id === id);
        if (!frame) return;

        showNotification(`正在下载 ${frame.name}...`, 'info');

        // Create blob from base64 data
        const byteCharacters = atob(frame.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = frame.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${frame.name} 下载成功`, 'success');
    }

    // Download all frames
    function downloadAllFrames() {
        if (extractedFrames.length === 0) return;

        showNotification(`正在准备 ${extractedFrames.length} 帧图片下载...`, 'info');

        // Download each frame with a delay to avoid overwhelming the browser
        extractedFrames.forEach((frame, index) => {
            setTimeout(() => {
                downloadSingleFrame(frame.id);
            }, index * 300); // 300ms delay between each file
        });
    }

    // Clear all frames
    function clearFrames() {
        extractedFrames = [];
        updateFramesDisplay();
        showNotification('已清空所有帧', 'info');
    }

    // Process uploaded video file
    function processUploadedVideo(file) {
        uploadedVideo = file;

        // Update file info display
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        videoDuration.textContent = '计算中...';
        fileInfo.style.display = 'block';

        // Create object URL for video preview
        if (videoObjectURL) {
            URL.revokeObjectURL(videoObjectURL);
        }
        videoObjectURL = URL.createObjectURL(file);

        // Setup video element
        videoPreview.src = videoObjectURL;
        videoPreview.load();

        // Show preview section
        previewSection.style.display = 'block';

        // Wait for video metadata to load
        videoPreview.onloadedmetadata = function() {
            videoElement = videoPreview;
            videoDuration.textContent = formatTime(videoPreview.duration);
            showNotification(`视频 "${file.name}" 上传成功，时长: ${formatTime(videoPreview.duration)}`, 'success');
            // Calculate and display total frames based on default FPS
            calculateAndDisplayTotalFrames();
        };

        videoPreview.onerror = function() {
            showNotification('无法加载视频文件，请检查格式', 'error');
            videoDuration.textContent = '加载失败';
        };

        // Clear previous frames
        clearFrames();
    }

    // File upload handling
    videoFileInput.addEventListener('change', handleFileUpload);

    // Drag and drop support
    const uploadArea = document.querySelector('#video-frame-extractor .file-upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }

    // Button event listeners
    extractFramesBtn.addEventListener('click', extractFrames);
    downloadAllFramesBtn.addEventListener('click', downloadAllFrames);
    clearFramesBtn.addEventListener('click', clearFrames);

    // FPS input change listener
    if (fpsInput) {
        fpsInput.addEventListener('input', calculateAndDisplayTotalFrames);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check if it's a video file
        if (!file.type.startsWith('video/')) {
            showNotification('请上传视频文件', 'error');
            return;
        }

        processUploadedVideo(file);
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

        const file = event.dataTransfer.files[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            showNotification('请上传视频文件', 'error');
            return;
        }

        // Set the file input value
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        videoFileInput.files = dataTransfer.files;

        processUploadedVideo(file);
    }

    // Clean up object URL when leaving tool
    window.addEventListener('beforeunload', function() {
        if (videoObjectURL) {
            URL.revokeObjectURL(videoObjectURL);
        }
    });
}