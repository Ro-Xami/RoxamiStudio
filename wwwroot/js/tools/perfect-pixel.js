function initPerfectPixel() {
    console.log('Initializing Perfect Pixel Tool');

    const imageInput = document.getElementById('pp-image-input');
    const fileInfo = document.getElementById('pp-file-info');
    const fileCountEl = document.getElementById('pp-file-count');
    const totalSizeEl = document.getElementById('pp-total-size');
    const gridWMode = document.getElementById('pp-grid-w-mode');
    const gridWVal = document.getElementById('pp-grid-w-val');
    const gridHMode = document.getElementById('pp-grid-h-mode');
    const gridHVal = document.getElementById('pp-grid-h-val');
    const sampleMethod = document.getElementById('pp-sample-method');
    const refineSlider = document.getElementById('pp-refine');
    const refineVal = document.getElementById('pp-refine-val');
    const denoiseCheck = document.getElementById('pp-denoise');
    const denoiseThr = document.getElementById('pp-denoise-thr');
    const denoiseThrVal = document.getElementById('pp-denoise-thr-val');
    const processBtn = document.getElementById('pp-process-btn');
    const resetBtn = document.getElementById('pp-reset-btn');
    const previewSection = document.getElementById('pp-preview-section');
    const originalImg = document.querySelector('#pp-original-preview img');
    const originalDims = document.querySelector('#pp-original-preview .preview-dimensions');
    const resultImg = document.querySelector('#pp-result-preview img');
    const resultDims = document.querySelector('#pp-result-preview .preview-dimensions');
    const playBtn = document.getElementById('pp-play-btn');
    const prevBtn = document.getElementById('pp-prev-btn');
    const nextBtn = document.getElementById('pp-next-btn');
    const frameCounter = document.getElementById('pp-frame-counter');
    const speedSelect = document.getElementById('pp-speed');
    const loopCheck = document.getElementById('pp-loop');
    const outputFiles = document.getElementById('pp-output-files');
    const downloadAllBtn = document.getElementById('pp-download-all-btn');

    let uploadedImages = [];
    let processedResults = [];
    let currentFrame = 0;
    let isPlaying = false;
    let playTimer = null;

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

    // ===================== Core Algorithm =====================

    function imageDataToGray(id) {
        const d = id.data;
        const gray = new Float32Array(id.width * id.height);
        for (let i = 0; i < gray.length; i++) {
            gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
        }
        return gray;
    }

    function sobelXY(gray, w, h) {
        const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        function conv2d(data, w, h, kernel) {
            const out = new Float32Array(w * h);
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    let s = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const ki = (ky + 1) * 3 + (kx + 1);
                            s += data[(y + ky) * w + (x + kx)] * kernel[ki];
                        }
                    }
                    out[y * w + x] = s;
                }
            }
            return out;
        }
        const gx = conv2d(gray, w, h, kx);
        const gy = conv2d(gray, w, h, ky);
        return [gx, gy];
    }

    function sumAbsGradX(gx, w, h) {
        const sum = new Float32Array(w);
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let y = 0; y < h; y++) {
                s += Math.abs(gx[y * w + x]);
            }
            sum[x] = s;
        }
        return sum;
    }

    function sumAbsGradY(gy, w, h) {
        const sum = new Float32Array(h);
        for (let y = 0; y < h; y++) {
            let s = 0;
            for (let x = 0; x < w; x++) {
                s += Math.abs(gy[y * w + x]);
            }
            sum[y] = s;
        }
        return sum;
    }

    function smooth1D(arr, ks) {
        const len = arr.length;
        if (ks < 3) return arr;
        if (ks % 2 === 0) ks++;
        const sigma = ks / 6.0;
        const half = (ks / 2) | 0;
        const kernel = new Float32Array(ks);
        let sum = 0;
        for (let i = 0; i < ks; i++) {
            const x = i - half;
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        for (let i = 0; i < ks; i++) kernel[i] /= sum;
        const result = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            let s = 0;
            for (let j = 0; j < ks; j++) {
                let idx = i + j - half;
                if (idx < 0) idx = 0;
                if (idx >= len) idx = len - 1;
                s += arr[idx] * kernel[j];
            }
            result[i] = s;
        }
        return result;
    }

    function findBestGrid(origin, rangeMin, rangeMax, gradMag) {
        const best = Math.round(origin);
        const len = gradMag.length;
        let mx = -Infinity;
        for (let i = 0; i < len; i++) {
            const v = gradMag[i];
            if (v > mx) mx = v;
        }
        if (mx < 1e-6) return best;
        const peaks = [];
        const rMin = Math.max(1, Math.round(origin - rangeMin));
        const rMax = Math.min(len - 2, Math.round(origin + rangeMax));
        for (let i = rMin; i <= rMax; i++) {
            if (gradMag[i] > gradMag[i - 1] && gradMag[i] > gradMag[i + 1]) {
                peaks.push({ val: gradMag[i], idx: i });
            }
        }
        if (peaks.length === 0) return best;
        peaks.sort((a, b) => b.val - a.val);
        return peaks[0].idx;
    }

    function refineGrids(imageData, gridW, gridH, refineIntensity) {
        const gray = imageDataToGray(imageData);
        const w = imageData.width;
        const h = imageData.height;
        const [gx, gy] = sobelXY(gray, w, h);
        const gradXSum = sumAbsGradX(gx, w, h);
        const gradYSum = sumAbsGradY(gy, w, h);
        const cellW = w / gridW;
        const cellH = h / gridH;
        const refineW = cellW * refineIntensity;
        const refineH = cellH * refineIntensity;
        const xCoords = [];
        const yCoords = [];

        let x = findBestGrid(w / 2, cellW, cellW, gradXSum);
        while (x < w + cellW / 2) {
            x = findBestGrid(x, refineW, refineW, gradXSum);
            xCoords.push(Math.round(x));
            x += cellW;
        }
        x = findBestGrid(w / 2, cellW, cellW, gradXSum) - cellW;
        while (x > -cellW / 2) {
            x = findBestGrid(x, refineW, refineW, gradXSum);
            xCoords.push(Math.round(x));
            x -= cellW;
        }

        let y = findBestGrid(h / 2, cellH, cellH, gradYSum);
        while (y < h + cellH / 2) {
            y = findBestGrid(y, refineH, refineH, gradYSum);
            yCoords.push(Math.round(y));
            y += cellH;
        }
        y = findBestGrid(h / 2, cellH, cellH, gradYSum) - cellH;
        while (y > -cellH / 2) {
            y = findBestGrid(y, refineH, refineH, gradYSum);
            yCoords.push(Math.round(y));
            y -= cellH;
        }

        xCoords.sort((a, b) => a - b);
        yCoords.sort((a, b) => a - b);
        return [xCoords, yCoords];
    }

    function createFixedGrid(iw, ih, gridW, gridH, refine, gradXSum, gradYSum) {
        gridW = Math.min(gridW, iw);
        gridH = Math.min(gridH, ih);
        if (gridW < 1) gridW = 1;
        if (gridH < 1) gridH = 1;        const cellW = iw / gridW;
        const cellH = ih / gridH;
        const refineW = cellW * refine;
        const refineH = cellH * refine;

        const xCoords = [];
        xCoords.push(0);
        for (let i = 1; i < gridW; i++) {
            const ideal = (i * iw) / gridW;
            xCoords.push(Math.round(findBestGrid(ideal, refineW, refineW, gradXSum)));
        }
        xCoords.push(iw);

        const yCoords = [];
        yCoords.push(0);
        for (let i = 1; i < gridH; i++) {
            const ideal = (i * ih) / gridH;
            yCoords.push(Math.round(findBestGrid(ideal, refineH, refineH, gradYSum)));
        }
        yCoords.push(ih);

        xCoords.sort((a, b) => a - b);
        yCoords.sort((a, b) => a - b);

        for (let i = 1; i < xCoords.length; i++) {
            if (xCoords[i] <= xCoords[i - 1]) xCoords[i] = xCoords[i - 1] + 1;
        }
        for (let i = 1; i < yCoords.length; i++) {
            if (yCoords[i] <= yCoords[i - 1]) yCoords[i] = yCoords[i - 1] + 1;
        }

        xCoords[0] = 0;
        xCoords[xCoords.length - 1] = iw;
        yCoords[0] = 0;
        yCoords[yCoords.length - 1] = ih;

        return [xCoords, yCoords];
    }

    function detectPeak(proj, peakWidth, relThr, minDist) {
        const len = proj.length;
        const center = (len / 2) | 0;
        let mx = -Infinity;
        for (let i = 0; i < len; i++) if (proj[i] > mx) mx = proj[i];
        if (mx < 1e-6) return null;
        const thr = mx * relThr;
        const candidates = [];
        for (let i = 1; i < len - 1; i++) {
            let isPeak = true;
            for (let j = 1; j < peakWidth; j++) {
                if (i - j < 0 || i + j >= len) continue;
                if (proj[i - j + 1] < proj[i - j] || proj[i + j - 1] < proj[i + j]) { isPeak = false; break; }
            }
            if (isPeak && proj[i] >= thr) {
                let leftClimb = 0;
                for (let k = i; k > 0; k--) {
                    if (proj[k] > proj[k - 1]) leftClimb = Math.abs(proj[i] - proj[k - 1]);
                    else break;
                }
                let rightFall = 0;
                for (let k = i; k < len - 1; k++) {
                    if (proj[k] > proj[k + 1]) rightFall = Math.abs(proj[i] - proj[k + 1]);
                    else break;
                }
                candidates.push({ index: i, score: Math.max(leftClimb, rightFall) });
            }
        }
        if (candidates.length === 0) return null;
        const left = candidates.filter(c => c.index < center - minDist && c.index > center * 0.25);
        const right = candidates.filter(c => c.index > center + minDist && c.index < center * 1.75);
        if (left.length === 0 || right.length === 0) return null;
        left.sort((a, b) => b.score - a.score);
        right.sort((a, b) => b.score - a.score);
        return Math.abs(right[0].index - left[0].index) / 2;
    }

    function fft1D(re, im, inverse) {
        const n = re.length;
        if (n <= 1) return;
        const evenRe = new Float32Array(n / 2);
        const evenIm = new Float32Array(n / 2);
        const oddRe = new Float32Array(n / 2);
        const oddIm = new Float32Array(n / 2);
        for (let i = 0; i < n / 2; i++) {
            evenRe[i] = re[i * 2];
            evenIm[i] = im[i * 2];
            oddRe[i] = re[i * 2 + 1];
            oddIm[i] = im[i * 2 + 1];
        }
        fft1D(evenRe, evenIm, inverse);
        fft1D(oddRe, oddIm, inverse);
        const sign = inverse ? 1 : -1;
        for (let k = 0; k < n / 2; k++) {
            const angle = sign * 2 * Math.PI * k / n;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const tRe = cos * oddRe[k] - sin * oddIm[k];
            const tIm = sin * oddRe[k] + cos * oddIm[k];
            re[k] = evenRe[k] + tRe;
            im[k] = evenIm[k] + tIm;
            re[k + n / 2] = evenRe[k] - tRe;
            im[k + n / 2] = evenIm[k] - tIm;
        }
    }

    function fft2D(grayData, w, h) {
        const paddedW = 1 << Math.ceil(Math.log2(w));
        const paddedH = 1 << Math.ceil(Math.log2(h));
        const re = new Float32Array(paddedW * paddedH);
        const im = new Float32Array(paddedW * paddedH);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++)
                re[y * paddedW + x] = grayData[y * w + x];

        for (let y = 0; y < paddedH; y++) {
            const rowRe = new Float32Array(paddedW);
            const rowIm = new Float32Array(paddedW);
            for (let x = 0; x < paddedW; x++) {
                rowRe[x] = re[y * paddedW + x];
                rowIm[x] = im[y * paddedW + x];
            }
            fft1D(rowRe, rowIm, false);
            for (let x = 0; x < paddedW; x++) {
                re[y * paddedW + x] = rowRe[x];
                im[y * paddedW + x] = rowIm[x];
            }
        }
        for (let x = 0; x < paddedW; x++) {
            const colRe = new Float32Array(paddedH);
            const colIm = new Float32Array(paddedH);
            for (let y = 0; y < paddedH; y++) {
                colRe[y] = re[y * paddedW + x];
                colIm[y] = im[y * paddedW + x];
            }
            fft1D(colRe, colIm, false);
            for (let y = 0; y < paddedH; y++) {
                re[y * paddedW + x] = colRe[y];
                im[y * paddedW + x] = colIm[y];
            }
        }
        return [re, im, paddedW, paddedH];
    }

    function fftShift(mag, pw, ph) {
        const shifted = new Float32Array(pw * ph);
        const hw = (pw / 2) | 0;
        const hh = (ph / 2) | 0;
        for (let y = 0; y < ph; y++) {
            for (let x = 0; x < pw; x++) {
                const sy = (y + hh) % ph;
                const sx = (x + hw) % pw;
                shifted[sy * pw + sx] = mag[y * pw + x];
            }
        }
        return shifted;
    }

    function estimateGridFFT(gray, w, h, peakWidth) {
        const [re, im, pw, ph] = fft2D(gray, w, h);
        for (let i = 0; i < pw * ph; i++) {
            const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
            re[i] = 1 - Math.log1p(mag);
        }
        const magShifted = fftShift(re, pw, ph);
        const bandR = (pw / 2) | 0;
        const bandC = (ph / 2) | 0;
        const hw = (pw / 2) | 0;
        const hh = (ph / 2) | 0;

        const rowSum = new Float32Array(pw);
        for (let x = 0; x < pw; x++) {
            let s = 0, cnt = 0;
            for (let y = hh - bandC; y < hh + bandC; y++) {
                if (y >= 0 && y < ph) { s += magShifted[y * pw + x]; cnt++; }
            }
            rowSum[x] = cnt > 0 ? s / cnt : 0;
        }
        const colSum = new Float32Array(ph);
        for (let y = 0; y < ph; y++) {
            let s = 0, cnt = 0;
            for (let x = hw - bandR; x < hw + bandR; x++) {
                if (x >= 0 && x < pw) { s += magShifted[y * pw + x]; cnt++; }
            }
            colSum[y] = cnt > 0 ? s / cnt : 0;
        }

        let mxRS = -Infinity, mnRS = Infinity;
        for (let i = 0; i < rowSum.length; i++) { if (rowSum[i] > mxRS) mxRS = rowSum[i]; if (rowSum[i] < mnRS) mnRS = rowSum[i]; }
        if (mxRS - mnRS > 1e-8) for (let i = 0; i < rowSum.length; i++) rowSum[i] = (rowSum[i] - mnRS) / (mxRS - mnRS);

        let mxCS = -Infinity, mnCS = Infinity;
        for (let i = 0; i < colSum.length; i++) { if (colSum[i] > mxCS) mxCS = colSum[i]; if (colSum[i] < mnCS) mnCS = colSum[i]; }
        if (mxCS - mnCS > 1e-8) for (let i = 0; i < colSum.length; i++) colSum[i] = (colSum[i] - mnCS) / (mxCS - mnCS);

        const smoothRS = smooth1D(rowSum, 17);
        const smoothCS = smooth1D(colSum, 17);
        const scaleRow = detectPeak(smoothRS, peakWidth, 0.35, 6);
        const scaleCol = detectPeak(smoothCS, peakWidth, 0.35, 6);
        if (scaleRow === null || scaleCol === null || scaleCol <= 0) return null;
        return [scaleCol, scaleRow];
    }

    function detectGridScale(imageData, peakWidth, minSize) {
        const gray = imageDataToGray(imageData);
        const w = imageData.width;
        const h = imageData.height;
        let result = estimateGridFFT(gray, w, h, peakWidth);
        if (result !== null) {
            const pxW = w / result[0];
            const pxH = h / result[1];
            if (Math.min(pxW, pxH) < minSize || Math.max(pxW, pxH) > 20 || pxW / pxH > 1.5 || pxH / pxW > 1.5) {
                result = null;
            }
        }
        if (result === null) {
            const [gx, gy] = sobelXY(gray, w, h);
            const gradXSum = sumAbsGradX(gx, w, h);
            const gradYSum = sumAbsGradY(gy, w, h);
            let mxX = -Infinity; for (let i = 0; i < gradXSum.length; i++) if (gradXSum[i] > mxX) mxX = gradXSum[i];
            let mxY = -Infinity; for (let i = 0; i < gradYSum.length; i++) if (gradYSum[i] > mxY) mxY = gradYSum[i];
            const thrX = mxX * 0.2;
            const thrY = mxY * 0.2;
            const peaksX = [], peaksY = [];
            for (let i = 1; i < gradXSum.length - 1; i++)
                if (gradXSum[i] > gradXSum[i - 1] && gradXSum[i] > gradXSum[i + 1] && gradXSum[i] >= thrX)
                    if (peaksX.length === 0 || i - peaksX[peaksX.length - 1] >= 4) peaksX.push(i);
            for (let i = 1; i < gradYSum.length - 1; i++)
                if (gradYSum[i] > gradYSum[i - 1] && gradYSum[i] > gradYSum[i + 1] && gradYSum[i] >= thrY)
                    if (peaksY.length === 0 || i - peaksY[peaksY.length - 1] >= 4) peaksY.push(i);
            if (peaksX.length < 4 || peaksY.length < 4) return null;
            const intervalsX = [], intervalsY = [];
            for (let i = 1; i < peaksX.length; i++) intervalsX.push(peaksX[i] - peaksX[i - 1]);
            for (let i = 1; i < peaksY.length; i++) intervalsY.push(peaksY[i] - peaksY[i - 1]);
            intervalsX.sort((a, b) => a - b);
            intervalsY.sort((a, b) => a - b);
            const medX = intervalsX[(intervalsX.length / 2) | 0];
            const medY = intervalsY[(intervalsY.length / 2) | 0];
            if (medX <= 0 || medY <= 0) return null;
            return [Math.round(w / medX), Math.round(h / medY)];
        }
        return [result[0], result[1]];
    }

    function sampleCenter(imageData, xCoords, yCoords) {
        const w = xCoords.length - 1;
        const h = yCoords.length - 1;
        const out = new Uint8ClampedArray(w * h * 4);
        const d = imageData.data;
        const iw = imageData.width;
        for (let y = 0; y < h; y++) {
            const cy = ((yCoords[y] + yCoords[y + 1]) / 2) | 0;
            const safeCy = Math.min(Math.max(cy, 0), imageData.height - 1);
            for (let x = 0; x < w; x++) {
                const cx = ((xCoords[x] + xCoords[x + 1]) / 2) | 0;
                const safeCx = Math.min(Math.max(cx, 0), iw - 1);
                const si = (safeCy * iw + safeCx) * 4;
                const di = (y * w + x) * 4;
                out[di] = d[si];
                out[di + 1] = d[si + 1];
                out[di + 2] = d[si + 2];
                out[di + 3] = d[si + 3];
            }
        }
        return out;
    }

    function sampleMedian(imageData, xCoords, yCoords) {
        const w = xCoords.length - 1;
        const h = yCoords.length - 1;
        const out = new Uint8ClampedArray(w * h * 4);
        const d = imageData.data;
        const iw = imageData.width;
        for (let y = 0; y < h; y++) {
            const y0 = yCoords[y];
            const y1 = yCoords[y + 1];
            for (let x = 0; x < w; x++) {
                const x0 = xCoords[x];
                const x1 = xCoords[x + 1];
                const rVals = [], gVals = [], bVals = [], aVals = [];
                for (let cy = y0; cy < y1; cy++) {
                    if (cy < 0 || cy >= imageData.height) continue;
                    for (let cx = x0; cx < x1; cx++) {
                        if (cx < 0 || cx >= iw) continue;
                        const si = (cy * iw + cx) * 4;
                        rVals.push(d[si]);
                        gVals.push(d[si + 1]);
                        bVals.push(d[si + 2]);
                        aVals.push(d[si + 3]);
                    }
                }
                rVals.sort((a, b) => a - b);
                gVals.sort((a, b) => a - b);
                bVals.sort((a, b) => a - b);
                aVals.sort((a, b) => a - b);
                const di = (y * w + x) * 4;
                out[di] = rVals.length > 0 ? rVals[(rVals.length / 2) | 0] : 0;
                out[di + 1] = gVals.length > 0 ? gVals[(gVals.length / 2) | 0] : 0;
                out[di + 2] = bVals.length > 0 ? bVals[(bVals.length / 2) | 0] : 0;
                out[di + 3] = aVals.length > 0 ? aVals[(aVals.length / 2) | 0] : 0;
            }
        }
        return out;
    }

    function sampleMajority(imageData, xCoords, yCoords, maxSamples, iters) {
        const w = xCoords.length - 1;
        const h = yCoords.length - 1;
        const out = new Uint8ClampedArray(w * h * 4);
        const d = imageData.data;
        const iw = imageData.width;
        for (let y = 0; y < h; y++) {
            const y0 = yCoords[y];
            const y1 = yCoords[y + 1];
            for (let x = 0; x < w; x++) {
                const x0 = xCoords[x];
                const x1 = xCoords[x + 1];
                const pixels = [];
                for (let cy = y0; cy < y1; cy++) {
                    if (cy < 0 || cy >= imageData.height) continue;
                    for (let cx = x0; cx < x1; cx++) {
                        if (cx < 0 || cx >= iw) continue;
                        const si = (cy * iw + cx) * 4;
                        pixels.push([d[si], d[si + 1], d[si + 2], d[si + 3]]);
                    }
                }
                if (pixels.length === 0) continue;
                let samples = pixels;
                if (samples.length > maxSamples) {
                    samples = [];
                    const step = pixels.length / maxSamples;
                    for (let i = 0; i < maxSamples; i++) samples.push(pixels[(i * step) | 0]);
                }
                if (samples.length < 2) {
                    const di = (y * w + x) * 4;
                    out[di] = samples[0][0]; out[di + 1] = samples[0][1]; out[di + 2] = samples[0][2]; out[di + 3] = samples[0][3];
                    continue;
                }
                let c0 = samples[0];
                let c1 = samples[0];
                let lastCnt0 = 0, lastCnt1 = 0;
                let maxDist = 0;
                for (let i = 0; i < samples.length; i++) {
                    for (let j = i + 1; j < samples.length; j++) {
                        const dist = (samples[i][0] - samples[j][0]) ** 2 + (samples[i][1] - samples[j][1]) ** 2 + (samples[i][2] - samples[j][2]) ** 2 + (samples[i][3] - samples[j][3]) ** 2;
                        if (dist > maxDist) { maxDist = dist; c0 = samples[i]; c1 = samples[j]; }
                    }
                }
                for (let iter = 0; iter < iters; iter++) {
                    let g0R = 0, g0G = 0, g0B = 0, g0A = 0, g0Cnt = 0;
                    let g1R = 0, g1G = 0, g1B = 0, g1A = 0, g1Cnt = 0;
                    for (let i = 0; i < samples.length; i++) {
                        const dr = samples[i][0] - c0[0], dg = samples[i][1] - c0[1], db = samples[i][2] - c0[2], da = samples[i][3] - c0[3];
                        const d0 = dr * dr + dg * dg + db * db + da * da;
                        const d1r = samples[i][0] - c1[0], d1g = samples[i][1] - c1[1], d1b = samples[i][2] - c1[2], d1a = samples[i][3] - c1[3];
                        const d1 = d1r * d1r + d1g * d1g + d1b * d1b + d1a * d1a;
                        if (d0 <= d1) { g0R += samples[i][0]; g0G += samples[i][1]; g0B += samples[i][2]; g0A += samples[i][3]; g0Cnt++; }
                        else { g1R += samples[i][0]; g1G += samples[i][1]; g1B += samples[i][2]; g1A += samples[i][3]; g1Cnt++; }
                    }
                    if (g0Cnt > 0) c0 = [(g0R / g0Cnt) | 0, (g0G / g0Cnt) | 0, (g0B / g0Cnt) | 0, (g0A / g0Cnt) | 0];
                    if (g1Cnt > 0) c1 = [(g1R / g1Cnt) | 0, (g1G / g1Cnt) | 0, (g1B / g1Cnt) | 0, (g1A / g1Cnt) | 0];
                    lastCnt0 = g0Cnt; lastCnt1 = g1Cnt;
                }
                const p = lastCnt0 >= lastCnt1 ? c0 : c1;
                const di = (y * w + x) * 4;
                out[di] = p[0]; out[di + 1] = p[1]; out[di + 2] = p[2]; out[di + 3] = p[3];
            }
        }
        return out;
    }

    function mergeSimilarColors(pixels, w, h, threshold) {
        const map = {};
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
            if (a === 0) continue;
            const key = `${r},${g},${b},${a}`;
            map[key] = (map[key] || 0) + 1;
        }

        const entries = Object.entries(map).map(([k, c]) => {
            const v = k.split(',').map(Number);
            return { r: v[0], g: v[1], b: v[2], a: v[3], count: c };
        });
        entries.sort((a, b) => b.count - a.count);

        const dominant = [];
        const thr2 = threshold * threshold;
        for (const c of entries) {
            let merged = false;
            for (const d of dominant) {
                const dr = c.r - d.r, dg = c.g - d.g, db = c.b - d.b, da = c.a - d.a;
                if (dr * dr + dg * dg + db * db + da * da < thr2) { merged = true; break; }
            }
            if (!merged) dominant.push(c);
        }

        const result = new Uint8ClampedArray(pixels.length);
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
            if (a === 0) { result[i + 3] = 0; continue; }
            let bestDist = Infinity, best = dominant[0];
            for (const d of dominant) {
                const dr = r - d.r, dg = g - d.g, db = b - d.b, da = a - d.a;
                const dist = dr * dr + dg * dg + db * db + da * da;
                if (dist < bestDist) { bestDist = dist; best = d; }
            }
            result[i] = best.r; result[i + 1] = best.g; result[i + 2] = best.b; result[i + 3] = best.a;
        }
        return result;
    }

    function getGridConfig() {
        let gridW = null, gridH = null;
        if (gridWMode.value === 'power2') gridW = parseInt(gridWVal.value);
        if (gridHMode.value === 'power2') gridH = parseInt(gridHVal.value);
        return { gridW, gridH };
    }

    function processSingleImage(imageData, gridW, gridH) {
        const refine = parseInt(refineSlider.value) / 100;
        const method = sampleMethod.value;

        let xCoords, yCoords;

        if (gridW !== null || gridH !== null) {
            let useW = gridW, useH = gridH;
            if (gridW === null || gridH === null) {
                const detected = detectGridScale(imageData, 6, 4.0);
                if (detected === null) {
                    showNotification('网格检测失败，请将宽高均设为2的次幂', 'error');
                    return null;
                }
                if (gridW === null) useW = detected[0];
                if (gridH === null) useH = detected[1];
            }
            const gray = imageDataToGray(imageData);
            const [gx, gy] = sobelXY(gray, imageData.width, imageData.height);
            const gradXSum = sumAbsGradX(gx, imageData.width, imageData.height);
            const gradYSum = sumAbsGradY(gy, imageData.width, imageData.height);
            [xCoords, yCoords] = createFixedGrid(imageData.width, imageData.height, useW, useH, refine, gradXSum, gradYSum);
        } else {
            const detected = detectGridScale(imageData, 6, 4.0);
            if (detected === null) {
                showNotification('网格检测失败，请手动指定2的次幂分辨率', 'error');
                return null;
            }
            [xCoords, yCoords] = refineGrids(imageData, detected[0], detected[1], refine);
        }

        const outW = xCoords.length - 1;
        const outH = yCoords.length - 1;

        let outData;
        if (method === 'majority') {
            outData = sampleMajority(imageData, xCoords, yCoords, 128, 6);
        } else if (method === 'median') {
            outData = sampleMedian(imageData, xCoords, yCoords);
        } else {
            outData = sampleCenter(imageData, xCoords, yCoords);
        }

        if (denoiseCheck.checked) {
            outData = mergeSimilarColors(outData, outW, outH, parseInt(denoiseThr.value));
        }

        return {
            width: outW,
            height: outH,
            data: outData
        };
    }

    // ===================== UI Logic =====================

    function processUpload(files) {
        uploadedImages.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
        });

        uploadedImages = [];
        processedResults = [];
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showNotification('请上传图片文件', 'warning');
            return;
        }

        const promises = imageFiles.map(file => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => resolve({ file, width: img.width, height: img.height, url, element: img });
                img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`无法加载: ${file.name}`)); };
                img.src = url;
            });
        });

        Promise.all(promises).then(images => {
            uploadedImages = images;
            processedResults = new Array(images.length).fill(null);
            const totalSize = images.reduce((s, i) => s + i.file.size, 0);
            fileCountEl.textContent = images.length;
            totalSizeEl.textContent = formatFileSize(totalSize);
            fileInfo.style.display = 'block';
            stopPlayback();
            currentFrame = 0;
            updatePreview();
            updateOutputDisplay();
            showNotification(`成功上传 ${images.length} 张图片`, 'success');
        }).catch(e => showNotification(`加载失败: ${e.message}`, 'error'));
    }

    function processAll() {
        if (uploadedImages.length === 0) {
            showNotification('请先上传图片', 'warning');
            return;
        }
        showNotification('正在处理...', 'info');
        const { gridW, gridH } = getGridConfig();
        let completed = 0;

        uploadedImages.forEach((img, index) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img.element, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            setTimeout(() => {
                const result = processSingleImage(imageData, gridW, gridH);
                if (result) {
                    const outCanvas = document.createElement('canvas');
                    outCanvas.width = result.width;
                    outCanvas.height = result.height;
                    const outCtx = outCanvas.getContext('2d');
                    const outImageData = new ImageData(result.data, result.width, result.height);
                    outCtx.putImageData(outImageData, 0, 0);
                    const dataUrl = outCanvas.toDataURL('image/png');
                    outCanvas.toBlob(blob => {
                        processedResults[index] = {
                            name: cleanFileName(img.file.name) + '.png',
                            size: blob.size,
                            blob,
                            dataUrl,
                            width: result.width,
                            height: result.height
                        };
                        completed++;
                        if (completed === uploadedImages.length) onAllDone();
                    }, 'image/png');
                } else {
                    completed++;
                    if (completed === uploadedImages.length) onAllDone();
                }
            }, 0);
        });

        function onAllDone() {
            currentFrame = 0;
            stopPlayback();
            updatePreview();
            updateOutputDisplay();
            updatePlayButtons();
            const cnt = processedResults.filter(r => r !== null).length;
            showNotification(`处理完成: ${cnt}/${uploadedImages.length}`, 'success');
        }
    }

    function resetAll() {
        processedResults.forEach(r => {
            if (r && r.previewUrl && r.previewUrl.startsWith('blob:')) URL.revokeObjectURL(r.previewUrl);
        });
        processedResults = new Array(uploadedImages.length).fill(null);
        stopPlayback();
        currentFrame = 0;
        updatePreview();
        updateOutputDisplay();
        updatePlayButtons();
        showNotification('已重置', 'info');
    }

    function updatePreview() {
        if (uploadedImages.length === 0) {
            previewSection.style.display = 'none';
            return;
        }
        const idx = currentFrame;
        const img = uploadedImages[idx];
        if (!img) return;
        originalImg.src = img.url;
        originalDims.textContent = `${img.width}×${img.height}`;
        const result = processedResults[idx];
        if (result) {
            resultImg.src = result.dataUrl;
            resultDims.textContent = `${result.width}×${result.height}`;
        } else {
            resultImg.src = img.url;
            resultDims.textContent = `${img.width}×${img.height}`;
        }
        frameCounter.textContent = `帧: ${idx + 1} / ${uploadedImages.length}`;
        previewSection.style.display = 'block';
        enablePreviewZoom(document.getElementById('pp-original-preview'));
        enablePreviewZoom(document.getElementById('pp-result-preview'));
    }

    function updatePlayButtons() {
        prevBtn.disabled = currentFrame <= 0;
        nextBtn.disabled = currentFrame >= uploadedImages.length - 1;
        if (uploadedImages.length <= 1) {
            prevBtn.disabled = nextBtn.disabled = true;
        }
    }

    function goToFrame(idx) {
        if (idx < 0 || idx >= uploadedImages.length) return;
        currentFrame = idx;
        updatePreview();
        updatePlayButtons();
    }

    function prevFrame() {
        if (currentFrame > 0) goToFrame(currentFrame - 1);
        else if (loopCheck.checked) goToFrame(uploadedImages.length - 1);
    }

    function nextFrame() {
        if (currentFrame < uploadedImages.length - 1) goToFrame(currentFrame + 1);
        else if (loopCheck.checked) goToFrame(0);
    }

    function startPlayback() {
        if (isPlaying) return;
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playTimer = setInterval(() => {
            if (currentFrame < uploadedImages.length - 1) {
                goToFrame(currentFrame + 1);
            } else {
                if (loopCheck.checked) goToFrame(0);
                else stopPlayback();
            }
        }, parseInt(speedSelect.value));
    }

    function stopPlayback() {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (playTimer) { clearInterval(playTimer); playTimer = null; }
    }

    function togglePlayback() {
        if (isPlaying) stopPlayback();
        else startPlayback();
    }

    function updateOutputDisplay() {
        const processed = processedResults.filter(r => r !== null);
        if (processed.length === 0) {
            outputFiles.innerHTML = '<p class="no-output">暂无处理输出。</p>';
            downloadAllBtn.disabled = true;
            return;
        }
        outputFiles.innerHTML = '';
        for (let i = 0; i < uploadedImages.length; i++) {
            const r = processedResults[i];
            if (!r) continue;
            const item = document.createElement('div');
            item.className = 'output-item';
            item.innerHTML = `
                <div class="output-item-info">
                    <i class="fas fa-image"></i>
                    <span class="output-item-name">${r.name}</span>
                    <span class="output-item-size">${formatFileSize(r.size)}</span>
                    <span class="output-item-dims">${r.width}×${r.height}</span>
                </div>
                <button class="small-btn pp-download-single" data-idx="${i}">
                    <i class="fas fa-download"></i> 下载
                </button>`;
            outputFiles.appendChild(item);
        }
        downloadAllBtn.disabled = processed.length === 0;
        document.querySelectorAll('.pp-download-single').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-idx'));
                const r = processedResults[idx];
                if (!r) return;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(r.blob);
                link.download = r.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            });
        });
    }

    function downloadAll() {
        const processed = processedResults.filter(r => r !== null);
        if (processed.length === 0) {
            showNotification('没有可下载的结果', 'warning');
            return;
        }
        showNotification(`正在下载 ${processed.length} 张...`, 'info');
        processed.forEach((r, i) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(r.blob);
                link.download = r.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            }, i * 200);
        });
    }

    // ===================== Event Listeners =====================

    imageInput.addEventListener('change', function() {
        if (this.files.length > 0) processUpload(this.files);
    });

    gridWMode.addEventListener('change', () => gridWVal.style.display = gridWMode.value === 'power2' ? '' : 'none');
    gridHMode.addEventListener('change', () => gridHVal.style.display = gridHMode.value === 'power2' ? '' : 'none');
    refineSlider.addEventListener('input', () => refineVal.textContent = (parseInt(refineSlider.value) / 100).toFixed(2));

    denoiseCheck.addEventListener('change', () => {
        denoiseThr.disabled = !denoiseCheck.checked;
    });
    denoiseThr.addEventListener('input', () => denoiseThrVal.textContent = denoiseThr.value);

    processBtn.addEventListener('click', processAll);
    resetBtn.addEventListener('click', resetAll);
    playBtn.addEventListener('click', togglePlayback);
    prevBtn.addEventListener('click', prevFrame);
    nextBtn.addEventListener('click', nextFrame);
    downloadAllBtn.addEventListener('click', downloadAll);

    speedSelect.addEventListener('change', () => {
        if (isPlaying) { stopPlayback(); startPlayback(); }
    });

    const uploadArea = document.querySelector('#perfect-pixel .file-upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); uploadArea.style.borderColor = 'var(--color-active)'; uploadArea.style.backgroundColor = 'var(--color-hover)'; });
        uploadArea.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); uploadArea.style.borderColor = 'var(--color-border)'; uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)'; });
        uploadArea.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation();
            uploadArea.style.borderColor = 'var(--color-border)'; uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
            if (e.dataTransfer.files.length > 0) {
                const dt = new DataTransfer();
                for (let i = 0; i < e.dataTransfer.files.length; i++) dt.items.add(e.dataTransfer.files[i]);
                imageInput.files = dt.files;
                processUpload(e.dataTransfer.files);
            }
        });
    }

    window.addEventListener('beforeunload', () => {
        uploadedImages.forEach(img => { if (img.url && img.url.startsWith('blob:')) URL.revokeObjectURL(img.url); });
    });
}
